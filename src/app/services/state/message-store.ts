import { LogBehaviorSubject } from 'src/rxjs/util'
import { InboundMessage, SentMessage, AttendingMessage, FailedMessage, Message, failed, attending, inbound, outbound, local, server, OutboundMessage } from '../cups/types'
import { Observable } from 'rxjs'
import { map, take, distinctUntilChanged } from 'rxjs/operators'
import { sortByTimestampDESC, uniqueBy, partitionBy, eqByJSON } from 'src/app/util'
import * as uuid from 'uuid'
import { LogLevel, LogTopic } from 'src/app/config'

// This is our in memory db for all messages loaded into the app from the server, or initiated by the user
export class MessageStore {
    private readonly $messages$: LogBehaviorSubject<Message[]> = new LogBehaviorSubject([], {
        level: LogLevel.TRACE, topic: LogTopic.MESSAGES, desc: 'messages'
    })

    constructor(){
    }

    $ingestMessages(msgs: Message[]): void {
        this.$messages$.pipe(take(1)).subscribe(ms => {
            this.$messages$.next(
                uniqueById(ms.concat(msgs))
            )
        })
    }

    toObservable() : Observable<Message[]>{
        return this.$messages$.pipe(
            map(ms => {
                // finalized messages include inbounds, sents, and faileds
                const {yes : attendings, no : finalizedMessages } = partitionBy(ms, attending)
                const sortedAs = attendings.sort(sortByTimestampDESC)
                const sortedFs = finalizedMessages.sort(sortByTimestampDESC)

                // attending messages presented after all finalized messages.
                return sortedAs.concat(sortedFs)
            }),
            distinctUntilChanged(eqByJSON)
        )
    }

    removeMessage(msg: OutboundMessage): Observable<boolean> {
        return this.$messages$.asObservable().pipe(take(1), map(
            ms => {
                const ind = ms.findIndex(m => m.trackingId === msg.trackingId)
                if(ind >= 0) {
                    const msClone = JSON.parse(JSON.stringify(ms))
                    msClone.splice(ind, 1)
                    this.$messages$.next(msClone)
                    return true
                } else {
                    return false
                }
            }
        ))
    }
}

export enum MessageState {
    INBOUND, SENT, ATTENDING, FAILED
}

export interface MessageDelta {
    trackingId: string
    new: MessageState
    old: MessageState
}

export interface MessageStoreSnapshot {
    inbounds: InboundMessage[],
    sents: SentMessage[],
    attendings: AttendingMessage[],
    faileds: FailedMessage[],
}

export const nillTrackingId = '00000000-0000-0000-0000-000000000000'
export function trackingId<Q extends Message>(t: Q): string {
    if(inbound(t)){
        // inbound messages are classified by their server id, as trackingId does not exist.
        return t.id
    } else if (outbound(t)) {
        // The nillTrackingId comes back on old sent messages preceeding certain backend changes.
        // We can assign this tracking id at random as only server messages can have nillTrackingId, and
        // the server guarantees it won't send back duplicates of the same message.
        return t.trackingId === nillTrackingId ? uuid.v4() : t.trackingId
    } else {
        throw new Error('unreachable: ' + JSON.stringify(t))
    }
}

// In the case two messages have the same trackingId, true means we take m1, false means we take m2.
export function uniqueById<Q extends Message>(ms: Q[]): Q[]{
    return uniqueBy(trackingId, ms, messageStatusHeirarchy)
}

export function messageStatusHeirarchy<Q extends Message>(m1: Q, m2: Q) {
    // server messages beat all
    if(server(m1)) return true
    if(server(m2)) return false

    // we can assert both m1 and m2 are now local.

    if(local(m1) && local(m2)) {
        // failed beats attending if same sentToServer timestam
        if(failed(m1) && m1.sentToServer === m2.sentToServer) return true
        if(failed(m2) && m2.sentToServer === m1.sentToServer) return false

        // otherwise most recent attempt wins
        if(m1.sentToServer > m2.sentToServer)  return true
        if(m1.sentToServer <= m2.sentToServer) return false
    } else {
        throw new Error('unreachable')
    }
}
