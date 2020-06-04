import { config, LogTopic } from 'src/app/config'
import { CupsMessenger } from '../../cups/cups-messenger'
import { Subscription, Observable, timer } from 'rxjs'
import { concatMap, switchMap, map, tap, filter, withLatestFrom } from 'rxjs/operators'
import { App } from '../app-state'
import { Injectable } from '@angular/core'
import { Contact, ContactWithMessageMeta, ServerMessage } from '../../cups/types'
import { Log } from 'src/app/log'
import { ShowMessagesOptions } from '../../cups/live-messenger'
import { suppressErrorOperator } from 'src/rxjs/util'
import { Router, NavigationStart } from '@angular/router'
import { Auth, AuthStatus } from '../auth-state'

enum Page {
    CONTACTS='/contacts', MESSAGES='/messages', OTHER = ''
}

@Injectable({providedIn: 'root'})
export class StateIngestionService {
    private page: Page
    private contactsCooldown: Subscription
    private messagesCooldown: Subscription

    constructor(private readonly cups: CupsMessenger, private readonly router: Router){
        this.router.events.pipe(filter(event => event instanceof NavigationStart)).subscribe((e: NavigationStart) => {
            Log.info(`navigated to`, e, LogTopic.NAV)
            this.page = e.url as Page
        })
    }

    // subscribe to this to get new contacts + automatically update state. Subscription callback
    // triggered on completion of both tasks.
    refreshContacts(testPassword?: string): Observable<ContactWithMessageMeta[]>{
        return new Observable(
            subscriber => {
                acquireContacts(this.cups, testPassword).subscribe(
                    {
                        next: cs => {
                            App.$ingestContacts.next(cs)
                            subscriber.next(cs)
                        },
                        complete: () => {
                            subscriber.complete()
                        },
                        error: e => subscriber.error(e)
                    }
                )
            }
        )
    }

    // subscribe to this to get new messages for contact + automatically update state. Subscription callback
    // triggered on completion of both tasks.
    refreshMessages(contact: Contact, options?: ShowMessagesOptions): Observable<{ contact: Contact, messages: ServerMessage[] }>{
        return new Observable(
            subscriber => {
                acquireMessages(this.cups, contact, options).subscribe(
                    {
                        next: ms => {
                            App.$ingestMessages.next(ms)
                            subscriber.next(ms)
                        },
                        complete: () => {
                            subscriber.complete()
                        },
                        error: e => subscriber.error(e)
                    }
                )
            }
        )
    }

    // idempotent
    // can be used to restart any dead subs.
    init(){
        this.startContactsCooldownSub()
        this.startMessagesCooldownSub()
    }

    shutdown(){
        if(this.contactsCooldown) this.contactsCooldown.unsubscribe()
        if(this.messagesCooldown) this.messagesCooldown.unsubscribe()
    }

    private startContactsCooldownSub(){        
        if(subIsActive(this.contactsCooldown) || !config.contactsDaemon.on) return
        Log.info('starting contacts daemon', config.contactsDaemon, LogTopic.CONTACTS)
        
        this.contactsCooldown =
            timer(0, config.contactsDaemon.frequency).pipe(
                withLatestFrom(Auth.emitStatus$()),
                filter(([_, s]) => s === AuthStatus.VERIFIED),
                tap(i => Log.debug('running contacts', i, LogTopic.CONTACTS)),
                concatMap(
                    () => acquireContacts(this.cups)
                ),
                suppressErrorOperator('acquire contacts')
            )
            .subscribe(App.$ingestContacts)
    }

    // When we're on the messages page for the current contact, get messages more frequently, and mark as read
    private startMessagesCooldownSub(){
        if(subIsActive(this.messagesCooldown) || !config.messagesDaemon.on) return
        Log.info('starting messages daemon', config.messagesDaemon, LogTopic.MESSAGES)

        this.messagesCooldown = App.emitCurrentContact$.pipe(
            switchMap(contact => {
                Log.debug(`switching contacts for messages`, contact, LogTopic.CURRENT_CONTACT)
                return timer(0, config.messagesDaemon.frequency).pipe(
                    filter(() => this.messagesPage()),
                    concatMap(
                        () => acquireMessages(this.cups, contact)
                    ),
                    suppressErrorOperator('acquire messages')
                )
            }),
        ).subscribe(ms =>{
            App.$ingestMessages.next(ms)
        })
    }

    contactsPage(): boolean {
        return this.page === Page.CONTACTS
    }
    messagesPage(): boolean {
        return this.page === Page.MESSAGES
    }
}

function acquireMessages(
    cups: CupsMessenger,
    contact: Contact,
    options: ShowMessagesOptions = {}
): Observable<{ contact: Contact, messages: ServerMessage[] }> {
    return cups.messagesShow(contact, options).pipe(
        tap(ms => Log.trace(`${ms.length} messages returning`, ms[0] && ms[0].text, LogTopic.MESSAGES)),
        map(ms => ({ contact, messages: ms }))
    )
}

function acquireContacts(
    cups: CupsMessenger, testPassword?: string
) : Observable<ContactWithMessageMeta[]> {
    return cups.contactsShow(testPassword).pipe(
        tap(cs => Log.trace(`contacts daemon returning`, cs, LogTopic.CONTACTS))
    )
}

function subIsActive(sub: Subscription | undefined): boolean {
    return sub && !sub.closed
}