import { Observable, NextObserver, Observer, of, Subject, BehaviorSubject } from 'rxjs'
import { ContactWithMessageMeta, Message, Contact, ServerMessage, server, OutboundMessage } from '../cups/types'
import { filter, map, concatMap, take, distinctUntilChanged } from 'rxjs/operators'
import { exists, LogBehaviorSubject, alterState } from '../../../rxjs/util'
import { LogLevel as L, LogTopic as T } from 'src/app/config'
import { Log } from 'src/app/log'
import { MessageStore } from './message-store'
import { partitionBy, sortByTimestampDESC } from 'src/app/util'

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

    emitCurrentContact$: Observable<ContactWithMessageMeta>
    emitContacts$: Observable<ContactWithMessageMeta[]>
    emitMessages$: (tor: string) => Observable<Message[]>

    // Subscribing to this will trigger the current contact to change, then emit the new contact c
    alterCurrentContact$(c: Contact): Observable<Contact> {
        return alterState(Private.$currentContact$, c)
    }

    constructor(){
        this.$ingestCurrentContact = Private.$currentContact$
        this.$ingestContacts = {
            next: cs => { 
                this.hasLoadedContacts = true
                Private.$contacts$.next(cs)
                cs.filter(c => c.lastMessages[0]).forEach(c => {
                    this.messagesFor(c.torAddress).$ingestMessages(c.lastMessages)
                })
            },
            complete: () => console.error(`Critical: contacts observer completed`),
            error: e => console.error('Critical: contacts observer errored', e)
        }
        this.$ingestMessages       = {
            next: ({contact, messages}) => {
                this.messagesFor(contact.torAddress).$ingestMessages(messages)
            },
            complete: () => console.error(`Critical: message observer completed`),
            error: e => console.error('Critical: message observer errored', e)
        }

        this.emitCurrentContact$   = Private.$currentContact$.asObservable().pipe(filter(exists))
        this.emitContacts$         = Private.$contacts$.asObservable()
        this.emitMessages$ = (tor: string) => this.messagesFor(tor).toObservable().pipe(distinctUntilChanged(eqAsJSON))

        this.emitCurrentContact$.subscribe(c => this.currentContact = c)
    }

    deleteContact(c: Contact): void {
        const store = this.messagesFor(c.torAddress)
        store.complete()
        this.eraseMessagesFor(c.torAddress)
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

    removeMessage$(c: Contact, o: OutboundMessage): Observable<boolean> {
        return this.messagesFor(c.torAddress).removeMessage(o)
    }

    private messagesFor(tor: string) {
        if(!Private.messagesStore[tor]) {
            Private.messagesStore[tor] = new MessageStore()
        }
        return Private.messagesStore[tor]
    }

    private eraseMessagesFor(tor: string) {
        delete Private.messagesStore[tor]
    }
}
    
export const App = new AppState()
export const eqAsJSON = (a,b) => JSON.stringify(a) === JSON.stringify(b)