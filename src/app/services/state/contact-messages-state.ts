import { BehaviorSubject, Observable, NextObserver } from 'rxjs'
import { ContactWithMessageCount, MessageBase, Contact, serverErrorAttendingPrioritization as serverMessagesOverwriteAttending, inbound, outbound } from '../cups/types'
import { take, filter, last, single } from 'rxjs/operators'
import { sortByTimestamp } from '../global-state'
import { uniqueBy } from 'src/app/util'
import * as uuid from 'uuid'
import { exists } from '../state-ingestion/util'

// Obesrvers will have $ prefix
// Observables will have $ suffic
// Subjects will have both
const Private = {
    $currentContact$: new BehaviorSubject(undefined) as BehaviorSubject<Contact>,
    $contacts$: new BehaviorSubject([]) as BehaviorSubject<ContactWithMessageCount[]>,
    messagesStore: {} as { [torAddress: string]: BehaviorSubject<MessageBase[]> }
}

export const State = {
    $ingestCurrentContent: Private.$currentContact$ as NextObserver<Contact>,
    $ingestContacts: this.$contacts$ as NextObserver<ContactWithMessageCount[]>,
    $ingestMessages: {
        next : ({contact, messages}) => {
            const messagesForContact$ = this.$messagesFor$(contact.torAddress)
            messagesForContact$.pipe(single()).subscribe(existingMessages => {
                const inbounds  = uniqueBy(t => t.id, messages.concat(existingMessages).filter(inbound))

                const outbounds = uniqueBy(
                    trackingId,
                    messages.concat(existingMessages).filter(outbound),
                    serverMessagesOverwriteAttending
                )

                const newMessageState = inbounds
                    .concat(outbounds)
                    .sort(sortByTimestamp)
                messagesForContact$.next(newMessageState)
            })
        }
    } as NextObserver<{ contact: Contact, messages: MessageBase[] }>,

    emitCurrentContact$: this.$currentContact$.asObservable().pipe(filter(exists)) as Observable<Contact>,
    emitContacts$: this.$contacts$.asObservable() as  Observable<ContactWithMessageCount[]>,
    emitMessages$: tor => this.$messagesFor$(tor).asObservable() as (tor: string) => Observable<MessageBase[]>,

    $messagesFor$: tor => {
        if(!this.messagesStore[tor]) { this.messagesStore[tor] = new BehaviorSubject([]) }
        return this.messagesStore[tor]
    }
}

const nillTrackingId = '00000000-0000-0000-0000-000000000000'

function trackingId<T extends { trackingId: string }>(t: T): string {
    return t.trackingId === nillTrackingId ? uuid.v4() : t.trackingId
}