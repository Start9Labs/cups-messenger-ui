import { BehaviorSubject, Observable, NextObserver } from 'rxjs'
import { ContactWithMessageCount, MessageBase, Contact, serverErrorAttendingPrioritization as serverMessagesThenAttendingMessages, inbound, outbound } from '../cups/types'
import { take } from 'rxjs/operators'
import { sortByTimestamp } from '../global-state'
import { uniqueBy } from 'src/app/util'
import * as uuid from 'uuid'

// Obesrvers will have $ prefix
// Observables will have $ suffic
// Subjects will have both
export class ContactMessagesState {
    $contacts$: BehaviorSubject<ContactWithMessageCount[]> = new BehaviorSubject([])
    contactMessagesStore: {
        [contactTorAddress: string]: BehaviorSubject<MessageBase[]>
    } = {}

    $ingestContactMessages: NextObserver<{ contact: Contact, messages: MessageBase[] }> = {
        next : ({contact, messages}) => {
            const $messagesSubject$ = this.$contactMessages$(contact.torAddress)
            $messagesSubject$.pipe(take(1)).subscribe(existingMessages => {
                const inbounds  = uniqueBy(messages.concat(existingMessages).filter(inbound), t => t.id)
                const outbounds = uniqueBy(
                    messages.concat(existingMessages).filter(outbound),
                    getTrackingId,
                    serverMessagesThenAttendingMessages
                )
                const newMessageState = inbounds.concat(outbounds).sort(sortByTimestamp)
                $messagesSubject$.next(newMessageState)
            })
        }
    }

    watchContacts$(): Observable<ContactWithMessageCount[]> {
        return this.$contacts$.asObservable()
    }

    watchContactMessages$(tor: string): Observable<MessageBase[]>{
        return this.$contactMessages$(tor).asObservable()
    }

    private $contactMessages$(tor: string): BehaviorSubject<MessageBase[]> {
        if(!this.contactMessagesStore[tor]) { this.contactMessagesStore[tor] = new BehaviorSubject([]) }
        return this.contactMessagesStore[tor]
    }
}

const nillTrackingId = '00000000-0000-0000-0000-000000000000'

function getTrackingId<T extends { trackingId: string }>(t: T): string {
    return t.trackingId === nillTrackingId ? uuid.v4() : t.trackingId
}