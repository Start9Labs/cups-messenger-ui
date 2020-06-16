import { Observable, NextObserver, of, BehaviorSubject } from 'rxjs'
import { ContactWithMessageMeta, Message, Contact, OutboundMessage } from '../cups/types'
import { filter, take, distinctUntilChanged, map, concatMap, tap, mapTo } from 'rxjs/operators'
import { exists, alterState as replaceState } from '../../../rxjs/util'
import { LogLevel as L, LogTopic as T, LogTopic } from 'src/app/config'
import { MessageStore } from './message-store'
import { Injectable } from '@angular/core'
import { Store } from './store'
import { Log } from 'src/app/log'

/* 
    Raw private app state. Shouldn't be accessed directly except by the below. 
*/
const Private = {
    $currentContact$: new BehaviorSubject<Contact | undefined>(undefined),
    $contacts$: new BehaviorSubject<ContactWithMessageMeta[]>([]),
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
    currentContact: Contact = undefined
    $ingestCurrentContact:  NextObserver<Contact>
    $ingestContacts:  NextObserver<ContactWithMessageMeta[]>
    $ingestMessages: NextObserver<{ contact: Contact, messages: Message[] }>

    emitCurrentContact$: Observable<ContactWithMessageMeta>
    emitContacts$: Observable<ContactWithMessageMeta[]>
    emitMessages$: (tor: string) => Observable<Message[]>

    // tslint:disable-next-line: member-ordering
    static readonly CONTACTS_STORE_KEY = 'contacts'
    static readonly MESSAGES_STORE_KEY = (tor: string) => `${tor}-messages`

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
                this.store.setValue$(AppState.CONTACTS_STORE_KEY, cs).subscribe()
                Private.$contacts$.next(cs)
                cs.filter(c => c.lastMessages[0]).forEach(c => {
                    this.messagesFor(c.torAddress).$ingestMessages(c.lastMessages)
                })
            },
        }
        this.$ingestMessages = {
            next: ({contact, messages}) => {
                this.store.setValue$(AppState.MESSAGES_STORE_KEY(contact.torAddress), messages).subscribe()
                this.messagesFor(contact.torAddress).$ingestMessages(messages)
            },
        }
    }

    pullContactStateFromStore(): Observable<{}> {
        return this.store.getValue$(AppState.CONTACTS_STORE_KEY, []).pipe(tap(cs => {
            Log.debug(`dredging contacts`, cs, LogTopic.CONTACTS)
            this.$ingestContacts.next(cs)
        }), mapTo({}))
    }

    pullMessageStateFromStore(c: Contact): Observable<{}> {
        return this.store.getValue$(AppState.MESSAGES_STORE_KEY(c.torAddress), []).pipe(tap(ms => {
            Log.debug(`dredging messages for ${c.name || c.torAddress}`, ms, LogTopic.MESSAGES)
            this.$ingestMessages.next({contact: c, messages: ms})
        }), mapTo({}))
    }

    // clears in memory state
    wipeState() {
        Private.$contacts$.next([])
        Private.$currentContact$.next(undefined)
        Object.keys(Private.messagesStore).forEach( tor => {
            this.eraseMessagesFor(tor)
        })
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
    forceMessagesUpdate$(newState: {contact: Contact, messages: Message[]}): Observable<Message[]> {
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