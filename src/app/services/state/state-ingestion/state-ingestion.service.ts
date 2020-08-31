import { config, LogTopic } from 'src/app/config'
import { CupsMessenger } from '../../cups/cups-messenger'
import { Subscription, Observable, timer } from 'rxjs'
import { concatMap, switchMap, map, tap, filter, withLatestFrom } from 'rxjs/operators'
import { AppState } from '../app-state'
import { Injectable } from '@angular/core'
import { Contact, ContactWithMessageMeta, ServerMessage } from '../../cups/types'
import { Log } from 'src/app/log'
import { ShowMessagesOptions } from '../../cups/live-messenger'
import { suppressErrorOperator } from 'src/rxjs/util'
import { Router, NavigationStart } from '@angular/router'
import { AuthState, AuthStatus } from '../auth-state'
import { BackgroundingService } from '../../backgrounding-service'

enum Page {
    CONTACTS = '/contacts', MESSAGES = '/messages', OTHER = ''
}
@Injectable({ providedIn: 'root' })
export class StateIngestionService {
    private page: Page
    private contactsCooldown: Subscription = undefined
    private messagesCooldown: Subscription = undefined

    constructor(
        private readonly cups: CupsMessenger,
        private readonly router: Router,
        private readonly authState: AuthState,
        private readonly backgroundingService: BackgroundingService,
        readonly appState: AppState,
    ) {
        this.router.events.pipe(filter(event => event instanceof NavigationStart)).subscribe((e: NavigationStart) => {
            Log.info(`navigated to`, e, LogTopic.NAV)
            this.page = e.url as Page
        })

        this.backgroundingService.onPause({
            name: 'daemonShutDown',
            f: () => this.shutdown()
        })

        this.backgroundingService.onResume({
            name: 'daemonStartUp',
            f: () => this.startup()
        })
    }

    // subscribe to this to get new contacts + automatically update state. Subscription callback
    // triggered on completion of both tasks.
    refreshContacts(testPassword?: string): Observable<ContactWithMessageMeta[]> {
        return new Observable(
            subscriber => {
                acquireContacts(this.cups, testPassword).subscribe(
                    {
                        next: cs => {
                            console.log('contacts', cs)
                            this.appState.$ingestContacts.next(cs)
                            subscriber.next(cs)
                        },
                        complete: () => {
                            console.log('contacts-refresh complete')
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
    refreshMessages(contact: Contact, options?: ShowMessagesOptions): Observable<{ contact: Contact, messages: ServerMessage[] }> {
        return new Observable(
            subscriber => {
                acquireMessages(this.cups, contact, options).subscribe(
                    {
                        next: ms => {
                            this.appState.$ingestMessages.next(ms)
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
    startup() {
        this.startContactsCooldownSub()
        this.startMessagesCooldownSub()
    }

    shutdown() {
        if (this.contactsCooldown) {
            this.contactsCooldown.unsubscribe()
        }
        if (this.messagesCooldown) {
            this.messagesCooldown.unsubscribe()
        }
    }

    private startContactsCooldownSub() {
        if (subIsActive(this.contactsCooldown) || !config.contactsDaemon.on) return
        Log.info('starting contacts daemon', config.contactsDaemon, LogTopic.CONTACTS)

        this.contactsCooldown =
            timer(config.contactsDaemon.frequency/3, config.contactsDaemon.frequency).pipe(
                withLatestFrom(this.authState.emitStatus$),
                filter(([_, s]) => s === AuthStatus.VERIFIED),
                tap(i => Log.debug('running contacts', i, LogTopic.CONTACTS)),
                concatMap(
                    () => acquireContacts(this.cups).pipe(suppressErrorOperator('contacts daemon'))
                ),
            ).subscribe({
                next: cs => this.appState.$ingestContacts.next(cs),
                complete: () => { Log.error(`Critical: contacts observer completed`, {}, LogTopic.CONTACTS); this.startup() },
                error: e => { Log.error('Critical: contacts observer errored', e, LogTopic.CONTACTS); this.startup() }
            })
    }

    // When we're on the messages page for the current contact, get messages more frequently, and mark as read
    private startMessagesCooldownSub() {
        if (subIsActive(this.messagesCooldown) || !config.messagesDaemon.on) return
        Log.info('starting messages daemon', config.messagesDaemon, LogTopic.MESSAGES)

        this.messagesCooldown =
            this.appState.emitCurrentContact$.pipe(
                switchMap(contact => {
                    Log.debug(`switching contacts for messages`, contact, LogTopic.CURRENT_CONTACT)
                    return timer(config.messagesDaemon.frequency, config.messagesDaemon.frequency).pipe(
                        withLatestFrom(this.authState.emitStatus$),
                        filter(([_, s]) => s === AuthStatus.VERIFIED),
                        filter(() => this.messagesPage()),
                        concatMap(
                            () => acquireMessages(this.cups, contact).pipe(suppressErrorOperator('messages daemon'))
                        ),
                    )
                }),
            ).subscribe({
                next: ms => this.appState.$ingestMessages.next(ms),
                complete: () => { Log.error(`Critical: messages observer completed`, {}, LogTopic.MESSAGES); this.startup() },
                error: e => { Log.error('Critical: messages observer errored', e, LogTopic.MESSAGES); this.startup() }
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
): Observable<ContactWithMessageMeta[]> {
    return cups.contactsShow(testPassword).pipe(
        tap(cs => Log.trace(`contacts daemon returning`, cs, LogTopic.CONTACTS))
    )
}

function subIsActive(sub: Subscription | undefined): boolean {
    return sub && !sub.closed
}