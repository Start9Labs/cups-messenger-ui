import { Observable, NextObserver, Observer, of, Subject, BehaviorSubject } from 'rxjs'
import { ContactWithMessageMeta, Message, Contact, ServerMessage, server } from '../cups/types'
import { filter, map, concatMap, take } from 'rxjs/operators'
import { exists, LogBehaviorSubject, alterState } from '../../../rxjs/util'
import { LogLevel as L, LogTopic as T } from 'src/app/config'
import { Log } from 'src/app/log'
import { MessageStore } from './message-store'

// Raw app state. Shouldn't be accessed directly except by the below.
const Private = {
    $currentContact$: new LogBehaviorSubject<Contact | undefined>(undefined, { topic: T.CURRENT_CONTACT, level: L.INFO, desc: 'currentContact' }),
    $contacts$: new LogBehaviorSubject<ContactWithMessageMeta[]>([], { topic: T.CONTACTS, level: L.DEBUG, desc: 'contacts' }),
    messagesStore: {} as { [torAddress: string]: MessageStore }
}


// Observers will have $prefix
// Observables will have suffix$
// Subjects will have both $subject$
export class AppState{
    hasLoadedContacts: boolean
    currentContact: Contact = undefined
    $ingestCurrentContact:  NextObserver<Contact>
    $ingestContacts:  NextObserver<ContactWithMessageMeta[]>
    $ingestMessages: NextObserver<{ contact: Contact, messages: Message[] }>

    emitCurrentContact$: Observable<Contact>
    emitContacts$: Observable<ContactWithMessageMeta[]>
    emitMessages$: (tor: string) => Observable<Message[]>

    // Subscribing to this will trigger the current contact to change, then emit the new contact c
    alterCurrentContact$(c: Contact): Observable<Contact> {
        return alterState(Private.$currentContact$, c)
    }

    constructor(){
        this.$ingestCurrentContact = Private.$currentContact$
        this.$ingestContacts       = {
            next: cs => { this.hasLoadedContacts = true; Private.$contacts$.next(cs) },
            complete: () => Log.error(`Critical: contacts observer completed`),
            error: e => Log.error('Critical: contacts observer errored', e)
        }
        this.$ingestMessages       = {
            next: ({contact, messages}) =>
                this.messagesFor(contact.torAddress).$ingestMessages(messages)
            ,
            complete: () => Log.error(`Critical: message observer completed`),
            error: e => Log.error('Critical: message observer errored', e)
        }

        this.emitCurrentContact$   = Private.$currentContact$.asObservable().pipe(filter(exists))
        this.emitContacts$         = Private.$contacts$.asObservable()
        this.emitMessages$ = (tor: string) => this.messagesFor(tor).toObservable()

        this.emitCurrentContact$.subscribe(c => this.currentContact = c)
    }

    alterContactMessages$(newState: {contact: Contact, messages: Message[]}): Observable<Message[]> {
        return of({}).pipe(
            concatMap(() => {
                this.$ingestMessages.next(newState)
                return this.emitMessages$(newState.contact.torAddress)
            }),
            take(1)
        )
    }

    private messagesFor(tor: string) {
        if(!Private.messagesStore[tor]) {
            Private.messagesStore[tor] = new MessageStore()
        }
        return Private.messagesStore[tor]
    }

    emitMostRecentServerMessage$(c: Contact): Observable<ServerMessage | undefined> {
        return this.emitMessages$(c.torAddress).pipe(map(ms => ms.filter(server)[0]))
    }

    emitOldestServerMessage$(c: Contact): Observable<ServerMessage | undefined> {
        return this.emitMessages$(c.torAddress).pipe(map(ms => ms.filter(server)[ms.length - 1]))
    }
}


export const App = new AppState()