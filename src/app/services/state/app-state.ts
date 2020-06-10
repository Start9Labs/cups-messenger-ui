import { Observable, NextObserver, of } from 'rxjs'
import { ContactWithMessageMeta, Message, Contact, OutboundMessage } from '../cups/types'
import { filter, take, distinctUntilChanged, map, concatMap, tap } from 'rxjs/operators'
import { exists, LogBehaviorSubject, alterState as replaceState } from '../../../rxjs/util'
import { LogLevel as L, LogTopic as T } from 'src/app/config'
import { MessageStore } from './message-store'
import { Injectable } from '@angular/core'
import { Store } from './store'
import { Log } from 'src/app/log'

/* 
    Raw private app state. Shouldn't be accessed directly except by the below. 
*/
const Private = {
    $currentContact$: new LogBehaviorSubject<Contact | undefined>(undefined, { topic: T.CURRENT_CONTACT, level: L.INFO, desc: 'currentContact' }),
    $contacts$: new LogBehaviorSubject<ContactWithMessageMeta[]>([], { topic: T.CONTACTS, level: L.DEBUG, desc: 'contacts' }),
    messagesStore: {} as { [torAddress: string]: MessageStore }
}

/* 
    AppState class provides the interface to in memory state. Subscribe with an 'ingest' subscriber to pump in new state. 
    Observe an 'emit' function to get updates about state changes

    Observers will have $prefix
    Observables will have suffix$
    Subjects will have both $subject$
*/
@Injectable({
    providedIn: 'root',
})
export class AppState {    
    hasLoadedContactsFromBrowserLogin: boolean
    currentContact: Contact = undefined
    $ingestCurrentContact:  NextObserver<Contact>
    $ingestContacts:  NextObserver<ContactWithMessageMeta[]>
    $ingestMessages: NextObserver<{ contact: Contact, messages: Message[] }>

    emitCurrentContact$: Observable<ContactWithMessageMeta>
    emitContacts$: Observable<ContactWithMessageMeta[]>
    emitMessages$: (tor: string) => Observable<Message[]>

    // tslint:disable-next-line: member-ordering
    static readonly CONTACTS_KEY = 'contacts'
    static readonly MESSAGES_KEY = (tor: string) => `${tor}-messages`

    constructor(
        private readonly store: Store,
    ){
        this.emitCurrentContact$ = Private.$currentContact$.asObservable().pipe(filter(exists))
        this.emitContacts$ = Private.$contacts$.asObservable()
        this.emitMessages$ = (tor: string) => this.messagesFor(tor).toObservable().pipe(distinctUntilChanged(eqAsJSON))
        
        this.emitCurrentContact$.subscribe(c => this.currentContact = c)

        this.$ingestCurrentContact = Private.$currentContact$
        this.$ingestContacts = {
            next: cs => { 
                this.store.setValue$(AppState.CONTACTS_KEY, cs).subscribe()
                Private.$contacts$.next(cs)
                cs.filter(c => c.lastMessages[0]).forEach(c => {
                    this.messagesFor(c.torAddress).$ingestMessages(c.lastMessages)
                })
            },
            complete: () => console.error(`Critical: contacts observer completed`),
            error: e => console.error('Critical: contacts observer errored', e)
        }
        this.$ingestMessages = {
            next: ({contact, messages}) => {
                this.store.setValue$(AppState.MESSAGES_KEY(contact.torAddress), messages).subscribe()
                this.messagesFor(contact.torAddress).$ingestMessages(messages)
            },
            complete: () => console.error(`Critical: message observer completed`),
            error: e => console.error('Critical: message observer errored', e)
        }
    }

    dredgeContactState(): Observable<ContactWithMessageMeta[]> {
        return this.store.getValue$(AppState.CONTACTS_KEY).pipe(concatMap(cs => {
            Log.debug(`dredging contacts`, cs)
            this.$ingestContacts.next(cs || [])
            return this.emitContacts$.pipe(take(1))
        }))
    }

    dredgeMessageState(c: Contact): Observable<{}> {
        return this.store.getValue$(AppState.MESSAGES_KEY(c.torAddress)).pipe(tap(ms => {
            Log.debug(`dredging messages for ${c.name || c.torAddress}`, ms)
            this.$ingestMessages.next({contact: c, messages: ms})
        }))
    }

    // clears in memory state
    wipeState() {
        Private.$contacts$.next([])
        Private.$currentContact$.next(undefined)
        Object.keys(Private.messagesStore).forEach( tor => {
            this.eraseMessagesFor(tor)
        })
        this.hasLoadedContactsFromBrowserLogin = false
    }

    //Replace current contact with c, emits when complete
    replaceCurrentContact$(c: Contact): Observable<Contact> {
        return replaceState(Private.$currentContact$, c)
    }

    deleteContact(c: Contact): void {
        this.messagesFor(c.torAddress).clear()
        this.eraseMessagesFor(c.torAddress)
    }

    //Replace current contact with c, emits when complete
    replaceContactMessages$(newState: {contact: Contact, messages: Message[]}): Observable<Message[]> {
        this.$ingestMessages.next(newState)
        return this.emitMessages$(newState.contact.torAddress).pipe(take(1))
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

    private eraseMessagesFor(torAddress: string) {
        this.messagesFor(torAddress).clear()
        this.store.deleteValue$(torAddress)
        delete Private.messagesStore[torAddress]

    }
}
    
export const eqAsJSON = (a,b) => JSON.stringify(a) === JSON.stringify(b)