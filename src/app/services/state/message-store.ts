import { LogBehaviorSubject } from 'src/rxjs/util'
import { InboundMessage, SentMessage, AttendingMessage, FailedMessage, Message, failed, attending, inbound } from '../cups/types'
import { Observable, combineLatest } from 'rxjs'
import { map, tap, take, distinctUntilChanged } from 'rxjs/operators'
import { sortByTimestamp, diffByProjection, uniqueBy, partitionBy, eqByJSON } from 'src/app/util'
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

    // // returns all messages excluding attendings
    // emitFinalMessages$(): Observable<Message[]> {
    //     return combineLatest([ this.$inbounds$, this.$sents$, this.$faileds$ ])
    //         .pipe(
    //             map(([, ]) => ),
    //             map(messages => messages.sort(sortByTimestamp))
    //         )
    // }

    // retryMessage$(f: FailedMessage): Observable<AttendingMessage> {
    //     const newAttendingMessage = {...f, failure: undefined}
    //     return this.$faileds$
    //         .pipe(
    //             tap(() => this.$ingestAppendTriggeredMessage(newAttendingMessage)),
    //             map(faileds => diffByProjection(trackingId, faileds, [f])),
    //             tap(([ failedWithOneRemoved, _ ]) => this.$faileds$.next(failedWithOneRemoved)),
    //             map(() => newAttendingMessage)
    //         )
    // }

    // sendMessage$(): Observable<AttendingMessage> {
    //     const newAttendingMessage = {...f, failure: undefined}
    //     return this.$faileds$
    //         .pipe(
    //             tap(() => this.$ingestAppendTriggeredMessage(newAttendingMessage)),
    //             map(faileds => diffByProjection(trackingId, faileds, [f])),
    //             tap(([ failedWithOneRemoved, _ ]) => this.$faileds$.next(failedWithOneRemoved)),
    //             map(() => newAttendingMessage)
    //         )
    // }

    toObservable() : Observable<Message[]>{
        return this.$messages$.pipe(
            map(ms => {
                // finalized messages include inbounds, sents, and faileds
                const {yes : attendings, no : finalizedMessages } = partitionBy(ms, attending)
                const sortedAs = attendings.sort(sortByTimestamp)
                const sortedFs = finalizedMessages.sort(sortByTimestamp)

                // attending messages presented after all finalized messages
                return sortedAs.concat(sortedFs)
            }),
            distinctUntilChanged(eqByJSON)
        )
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
    } else {
        // The nillTrackingId comes back on old server messages preceeding certain backend changes.
        // We can assign this tracking id at random as only server messages can have nillTrackingId, and
        // the server guarantees it won't send back duplicates of the same message.
        return t.trackingId === nillTrackingId ? uuid.v4() : t.trackingId
    }
}


function uniqueById<Q extends Message>(ms: Q[]): Q[]{
    return uniqueBy(trackingId, ms, (m1, m2) => {
        if(attending(m2)) return true // everything beats attending
        if(attending(m1)) return false

        if(failed(m2)) return true // now that neither are attending, everything beats failed (i.e, sent > failed)
        if(failed(m1)) return false

        return true // otherwise the records should be identical, so either one works.
    })
}


