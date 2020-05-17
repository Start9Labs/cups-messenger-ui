import { Observable, NextObserver, Observer } from 'rxjs'
import { ContactWithMessageCount, Message, Contact, serverMessagesOverwriteAttending, inbound, outbound, ServerMessage, server, sent, FailedMessage, AttendingMessage, failed, attending } from '../cups/types'
import { filter, map, take } from 'rxjs/operators'
import { uniqueBy, sortByTimestamp } from 'src/app/util'
import * as uuid from 'uuid'
import { exists, LogBehaviorSubject, alterState } from '../../../rxjs/util'
import { LogLevel as L, LogTopic as T } from 'src/app/config'
import { Log } from 'src/app/log'
import { MessageStore, trackingId, MessageStoreSnapshot } from './message-store'

// Raw app state. Shouldn't be accessed directly except by the below.
const Private = {
    $currentContact$: new LogBehaviorSubject<Contact | undefined>(undefined, { topic: T.CURRENT_CONTACT, level: L.INFO, desc: 'currentContact' }),
    $contacts$: new LogBehaviorSubject<ContactWithMessageCount[]>([], { topic: T.CONTACTS, level: L.DEBUG, desc: 'contacts' }),
    messagesStore: {} as { [torAddress: string]: MessageStore },

    messagesFor: (tor: string) => {
        if(!Private.messagesStore[tor]) {
            Private.messagesStore[tor] = new MessageStore()
        }
        return Private.messagesStore[tor]
    }
}

// Observers will have $prefix
// Observables will have suffix$
// Subjects will have both $subject$
export class AppState{
    currentContact: Contact = undefined
    $ingestCurrentContact:  NextObserver<Contact>
    $ingestContacts:  NextObserver<ContactWithMessageCount[]>
    $ingestMessages: NextObserver<{ contact: Contact, messages: Message[] }>

    emitCurrentContact$: Observable<Contact>
    emitContacts$: Observable<ContactWithMessageCount[]>
    emitMessages$: (tor: string) => Observable<MessageStoreSnapshot>

    // Subscribing to this will trigger the current contact to change, then emit the new contact c
    alterCurrentContact$(c: Contact): Observable<Contact> {
        return alterState(Private.$currentContact$, c)
    }

    constructor(){
        this.$ingestCurrentContact = Private.$currentContact$
        this.$ingestContacts       = Private.$contacts$
        this.$ingestMessages       = ingestServerMessagesObserver

        this.emitCurrentContact$ = Private.$currentContact$.asObservable().pipe(filter(exists))
        this.emitContacts$       = Private.$contacts$.asObservable()
        this.emitMessages$ = (tor: string) => Private.messagesFor(tor)

        this.emitCurrentContact$.subscribe(c => this.currentContact = c)
    }

    emitMostRecentServerMessage$(c: Contact): Observable<ServerMessage | undefined> {
        return this.emitMessages$(c.torAddress).pipe(map(ms => ms.filter(server)[0]))
    }

    emitOldestServerMessage$(c: Contact): Observable<ServerMessage | undefined> {
        return this.emitMessages$(c.torAddress).pipe(map(ms => ms.filter(server)[ms.length - 1]))
    }
}

const ingestTriggeredMessageObserver: Observer<{contact: Contact, message: FailedMessage | AttendingMessage }> = 
    {
        next: ({contact, message}) => {
            Private.messagesFor(contact.torAddress).$ingestAppendTriggeredMessage(message)
            Log.trace(`triggered message into logic`, message)
        },
        complete: () => Log.error(`triggered observer completed...`),
        error: e => Log.error('triggered observer errored', e)
    }

const ingestServerMessagesObserver: Observer<{contact: Contact, messages: ServerMessage[] }> =
    {
        next: ({contact, messages}) => {
            Private.messagesFor(contact.torAddress).$ingestReplaceServerMessages(messages)
            Log.trace(`messages into logic`, messages)
        },
        complete: () => Log.error(`Critical: server observer completed...`),
        error: e => Log.error('Critical: server observer errored', e)
    }

export const App = new AppState()