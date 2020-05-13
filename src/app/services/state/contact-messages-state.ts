import { BehaviorSubject, Observable, NextObserver } from 'rxjs'
import { ContactWithMessageCount, MessageBase, Contact, serverMessagesOverwriteAttending, inbound, outbound, ServerMessage, isServer } from '../cups/types'
import { filter, single, map } from 'rxjs/operators'
import { uniqueBy, sortByTimestamp } from 'src/app/util'
import * as uuid from 'uuid'
import { exists } from '../state-ingestion/util'

// Obesrvers will have $prefix
// Observables will have suffix$
// Subjects will have both $subject$
const Private = {
    $currentContact$: new BehaviorSubject(undefined) as BehaviorSubject<Contact>,
    $contacts$: new BehaviorSubject([]) as BehaviorSubject<ContactWithMessageCount[]>,
    messagesStore: {} as { [torAddress: string]: BehaviorSubject<MessageBase[]> },

    $messagesFor$: tor => {
        if(!this.messagesStore[tor]) { this.messagesStore[tor] = new BehaviorSubject([]) }
        return this.messagesStore[tor]
    }
}

export class ContactMessagesState{
    $ingestCurrentContact:  NextObserver<Contact>
    $ingestContacts:  NextObserver<ContactWithMessageCount[]>
    $ingestMessages: NextObserver<{ contact: Contact, messages: MessageBase[] }>

    emitCurrentContact$: Observable<Contact>
    emitContacts$: Observable<ContactWithMessageCount[]>
    emitMessages$: (tor: string) => Observable<MessageBase[]>

    constructor(){
        this.$ingestCurrentContact = Private.$currentContact$,
        this.$ingestContacts = Private.$contacts$,
        this.$ingestMessages = {
            next : ({contact, messages}) => {
                const messagesForContact$ = Private.$messagesFor$(contact.torAddress)
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
        }

        this.emitCurrentContact$ = Private.$currentContact$.asObservable().pipe(filter(exists))
        this.emitContacts$ = Private.$contacts$.asObservable()
        this.emitMessages$ = (tor: string) => Private.$messagesFor$(tor).asObservable()
    }

    emitMostRecentServerMessage$(c: Contact): Observable<ServerMessage | undefined> {
        return this.emitMessages$(c.torAddress).pipe(map(ms => ms.filter(isServer)[0]))
    }

    emitOldestServerMessage$(c: Contact): Observable<ServerMessage | undefined> {
        return this.emitMessages$(c.torAddress).pipe(map(ms => ms.filter(isServer)[ms.length - 1]))
    }
}

export const State = new ContactMessagesState()

const nillTrackingId = '00000000-0000-0000-0000-000000000000'

function trackingId<T extends { trackingId: string }>(t: T): string {
    return t.trackingId === nillTrackingId ? uuid.v4() : t.trackingId
}