import { config, LogTopic } from 'src/app/config'
import { CupsMessenger } from '../../cups/cups-messenger'
import { Subscription, Observable, timer } from 'rxjs'
import { concatMap, switchMap, map, tap } from 'rxjs/operators'
import { App } from '../app-state'
import { Injectable } from '@angular/core'
import { Contact, ContactWithMessageCount, ServerMessage } from '../../cups/types'
import { Log } from 'src/app/log'
import { ShowMessagesOptions } from '../../cups/live-messenger'
import { suppressErrorOperator } from 'src/rxjs/util'

@Injectable({providedIn: 'root'})
export class StateIngestionService {
    private contactsCooldown: Subscription
    private messagesCooldown: Subscription
    constructor(private readonly cups: CupsMessenger){}

    // subscribe to this to get new contacts + automatically update state. Subscription callback
    // triggered on completion of both tasks.
    refreshContacts(testPassword?: string): Observable<ContactWithMessageCount[]>{
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
                            console.log(`acquireMessages ${JSON.stringify(ms)}`)
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
        if(subIsActive(this.contactsCooldown)) return
        this.contactsCooldown =
                timer(0, config.contactsDaemon.frequency).pipe(
                    concatMap(
                        () => acquireContacts(this.cups).pipe(suppressErrorOperator('acquire contacts'))
                    )
                )
            .subscribe(App.$ingestContacts)
    }

    private startMessagesCooldownSub(){
        if(subIsActive(this.messagesCooldown)) return

        this.messagesCooldown = App.emitCurrentContact$.pipe(
            switchMap(contact => {
                Log.trace(`switching contacts for messages`, contact, LogTopic.CURRENT_CONTACT)
                return timer(0, config.messagesDaemon.frequency).pipe(
                    concatMap(
                        () => acquireMessages(this.cups, contact).pipe(suppressErrorOperator('acquire messages'))
                    ),
                )
            }),
        ).subscribe(ms =>{
            App.$ingestMessages.next(ms)
        })
    }
}

function acquireMessages(
    cups: CupsMessenger,
    contact: Contact,
    options: ShowMessagesOptions = {}
): Observable<{ contact: Contact, messages: ServerMessage[] }> {
    return cups.messagesShow(contact, options).pipe(
        tap(ms => Log.trace(`messages daemon returning`, ms, LogTopic.MESSAGES)),
        map(ms => ({ contact, messages: ms }))
    )
}

function acquireContacts(
    cups: CupsMessenger, testPassword?: string
) : Observable<ContactWithMessageCount[]> {
    return cups.contactsShow(testPassword).pipe(
        tap(cs => Log.trace(`contacts daemon returning`, cs, LogTopic.CONTACTS)),
        map(cs => cs.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages))
    )
}

function subIsActive(sub: Subscription | undefined): boolean {
    return sub && !sub.closed
}