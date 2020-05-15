import { Observable, NextObserver, Observer, of } from 'rxjs'
import { ContactWithMessageCount, MessageBase, Contact, serverMessagesOverwriteAttending, inbound, outbound, ServerMessage, isServer } from '../cups/types'
import { filter, map, take, tap, concatMap } from 'rxjs/operators'
import { uniqueBy, sortByTimestamp } from 'src/app/util'
import * as uuid from 'uuid'
import { exists, LogBehaviorSubject, alterState } from '../../../rxjs/util'
import { LogLevel as L, LogTopic as T } from 'src/app/config'
import { Log } from 'src/app/log'

const nillTrackingId = '00000000-0000-0000-0000-000000000000'

function trackingId<T extends { trackingId: string }>(t: T): string {
    return t.trackingId === nillTrackingId ? uuid.v4() : t.trackingId
}

// Raw app state. Shouldn't be accessed directly except by the below.
const Private = {
    $currentContact$: new LogBehaviorSubject<Contact | undefined>(undefined, { topic: T.CURRENT_CONTACT, level: L.INFO, desc: 'currentContact' }),
    $contacts$: new LogBehaviorSubject<ContactWithMessageCount[]>([], { topic: T.CONTACTS, level: L.DEBUG, desc: 'contacts' }),
    messagesStore: {} as { [torAddress: string]: LogBehaviorSubject<MessageBase[]> },

    $messagesFor$: tor => {
        if(!Private.messagesStore[tor]) {
            Private.messagesStore[tor] = new LogBehaviorSubject([], {level: L.DEBUG, topic: T.MESSAGES, desc: `${tor} messages`})
        }
        return Private.messagesStore[tor]
    }
}

// Observers will have $prefix
// Observables will have suffix$
// Subjects will have both $subject$
export class AppState{
    $ingestCurrentContact:  NextObserver<Contact>
    $ingestContacts:  NextObserver<ContactWithMessageCount[]>
    $ingestMessages: NextObserver<{ contact: Contact, messages: MessageBase[] }>

    emitCurrentContact$: Observable<Contact>
    emitContacts$: Observable<ContactWithMessageCount[]>
    emitMessages$: (tor: string) => Observable<MessageBase[]>

    // Subscribing to this will trigger the current contact to change, then emit the new contact c
    alterCurrentContact$(c: Contact): Observable<Contact> {
        return alterState(Private.$currentContact$, c)
    }

    constructor(){
        this.$ingestCurrentContact = Private.$currentContact$
        this.$ingestContacts       = Private.$contacts$
        this.$ingestMessages       = ingestMessagesObserver

        this.emitCurrentContact$ = Private.$currentContact$.asObservable().pipe(filter(exists))
        this.emitContacts$       = Private.$contacts$.asObservable()
        this.emitMessages$ = (tor: string) => Private.$messagesFor$(tor)
    }

    emitMostRecentServerMessage$(c: Contact): Observable<ServerMessage | undefined> {
        return this.emitMessages$(c.torAddress).pipe(map(ms => ms.filter(isServer)[0]))
    }

    emitOldestServerMessage$(c: Contact): Observable<ServerMessage | undefined> {
        return this.emitMessages$(c.torAddress).pipe(map(ms => ms.filter(isServer)[ms.length - 1]))
    }
}


const ingestMessagesObserver: Observer<{contact: Contact, messages: MessageBase[] }> =
    {
        next: ({contact, messages}) => {
            Log.trace(`messages into logic`, messages)
            const $messagesForContact$ = Private.$messagesFor$(contact.torAddress)
            $messagesForContact$.pipe(take(1)).subscribe(existingMessages => {
                Log.trace(`existing messages`, messages)
                const inbounds  = uniqueBy(t => t.id, messages.concat(existingMessages).filter(inbound))

                const outbounds = uniqueBy(
                    trackingId,
                    messages.concat(existingMessages).filter(outbound),
                    serverMessagesOverwriteAttending
                )

                const newMessageState = inbounds
                    .concat(outbounds)
                    .sort(sortByTimestamp)
                $messagesForContact$.next(newMessageState)
            })
        },
        complete: () => {
            Log.trace(`completed...`)
        },
        error: (e) =>{
            Log.trace('errored', e)
        }
    }

export const App = new AppState()