import { LogBehaviorSubject } from 'src/rxjs/util'
import { InboundMessage, SentMessage, AttendingMessage, FailedMessage, Message, failed, attending, ServerMessage, sent, inbound } from '../cups/types'
import { Observable, combineLatest, NextObserver } from 'rxjs'
import { map, tap, take } from 'rxjs/operators'
import { sortByTimestamp, diffByProjection, uniqueBy } from 'src/app/util'
import { LogLevel as L, LogTopic as T } from 'src/app/config'
import * as uuid from 'uuid'

// This is our in memory db for all messages loaded into the app from the server, or initiated by the user
export class MessageStore {
    private readonly $inbounds$: LogBehaviorSubject<InboundMessage[]>
         = new LogBehaviorSubject([], { topic: T.MESSAGES, level: L.TRACE, desc: 'inbound messages' })
    private readonly $sents$: LogBehaviorSubject<SentMessage[]>
         = new LogBehaviorSubject([], { topic: T.MESSAGES, level: L.TRACE, desc: 'sent messages' })
    private readonly $attendings$: LogBehaviorSubject<AttendingMessage[]>
         = new LogBehaviorSubject([], { topic: T.MESSAGES, level: L.TRACE, desc: 'attending messages' })
    private readonly $faileds$: LogBehaviorSubject<FailedMessage[]>
         = new LogBehaviorSubject([], { topic: T.MESSAGES, level: L.TRACE, desc: 'failed messages' })

    constructor(){
    }

    $ingestReplaceServerMessages(msgs: ServerMessage[]): void {
        this.$sents$.next(msgs.filter(sent))
        this.$inbounds$.next(msgs.filter(inbound))
    }

    // idempotent
    $ingestAppendTriggeredMessage<Q extends AttendingMessage | FailedMessage>(message: Q): void {
        if(attending(message)){
            this.$attendings$.pipe(take(1)).subscribe(attendings => {
                this.$attendings$.next(uniqueByTrackingId(attendings.concat(message)))
            })
        } else if (failed(message)){
            this.$faileds$.pipe(take(1)).subscribe(faileds => {
                this.$faileds$.next(uniqueByTrackingId(faileds.concat(message)))
            })
        }
    }

    // returns the attendings which have just become sent before removing them from the $attendings$ store
    flushAttending$(): Observable<AttendingMessage[]>{
        return combineLatest([ this.$attendings$ ,   this.$sents$   ])
            .pipe(
                map(([    attendings     ,       sents      ]) => diffByProjection(trackingId, attendings, sents)),
                tap(([ attendingsNotSent , ________________ ]) => this.$attendings$.next(attendingsNotSent)      ),
                map(([ _________________ ,  attendingsSent  ]) => attendingsSent                                 )
            )
    }

    // returns all messages excluding attendings
    emitFinalMessages$(): Observable<Message[]> {
        return combineLatest([ this.$inbounds$, this.$sents$, this.$faileds$ ])
            .pipe(
                map(([ inbounds, sents, faileds ]) => (inbounds as Message[]).concat((sents as Message[])).concat((faileds as Message[]))),
                map(messages => messages.sort(sortByTimestamp))
            )
    }

    retryMessage$(f: FailedMessage): Observable<AttendingMessage> {
        const newAttendingMessage = {...f, failure: undefined}
        return this.$faileds$
            .pipe(
                tap(() => this.$ingestAppendTriggeredMessage(newAttendingMessage)),
                map(faileds => diffByProjection(trackingId, faileds, [f])),
                tap(([ failedWithOneRemoved, _ ]) => this.$faileds$.next(failedWithOneRemoved)),
                map(() => newAttendingMessage)
            )
    }

    emitAttendings$(): Observable<Message[]> {
        return this.$attendings$.pipe(map(as => as.sort(sortByTimestamp)))
    }

    toObservable() : Observable<MessageStoreSnapshot>{
        return combineLatest([
            this.$inbounds$,
            this.$sents$,
            this.$attendings$,
            this.$faileds$,
        ]).pipe(map(
            ([i, s, a ,f]) => ({
                inbounds: i,
                sents: s,
                attendings: a,
                faileds: f
            })
        ))
    }
}

export interface MessageStoreSnapshot {
    inbounds: InboundMessage[],
    sents: SentMessage[],
    attendings: AttendingMessage[],
    faileds: FailedMessage[],
}

// The nillTrackingId comes back on old server messages preceeding certain backend changes.
// We can assign this tracking id at random as only server messages can have nillTrackingId, and
// the server guarantees it won't send back duplicates of the same message.
export const nillTrackingId = '00000000-0000-0000-0000-000000000000'
export function trackingId<Q extends { trackingId: string }>(t: Q): string {
    return t.trackingId === nillTrackingId ? uuid.v4() : t.trackingId
}

function uniqueByTrackingId<Q extends Message>(ms: Q[]): Q[]{
    return uniqueBy(trackingId, ms)
}


