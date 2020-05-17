import { config, LogTopic } from 'src/app/config'
import { CupsMessenger } from '../../cups/cups-messenger'
import { Subscription, Observable, interval, of, timer, combineLatest } from 'rxjs'
import { concatMap, tap, delay, take, repeat, first, switchMap } from 'rxjs/operators'
import { App } from '../app-state'
import { Injectable } from '@angular/core'
import { Contact, ContactWithMessageCount, ServerMessage } from '../../cups/types'
import { Log } from 'src/app/log'
import { Refresh } from './acquire-state'

@Injectable({providedIn: 'root'})
export class StateIngestionService {
    private contactsCooldown: Subscription
    private messagesCooldown: Subscription
    constructor(private readonly cups: CupsMessenger){}

    // can sub to this to get new contacts, update state, and react to completion at callsite.
    refreshContacts(): Observable<ContactWithMessageCount[]>{
        return new Observable(
            subscriber => {
                Refresh.contacts(this.cups).subscribe(
                    {
                        next: cs => {
                            App.$ingestContacts.next(cs)
                            subscriber.next(cs)
                        },
                        complete: () => {
                            subscriber.complete()
                        }
                    }
                )
            }
        )
    }

    // can sub to this to get new messages, update state, and react to completion at callsite.
    refreshMessages(contact: Contact): Observable<{ contact: Contact, messages: ServerMessage[] }>{
        return new Observable(
            subscriber => {
                Refresh.messages(this.cups, contact).subscribe(
                    {
                        next: ms => {
                            App.$ingestMessages.next(ms)
                            subscriber.next(ms)
                        },
                        complete: () => {
                            subscriber.complete()
                        }
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
                    concatMap(() => Refresh.contacts(this.cups))
                )
            .subscribe(App.$ingestContacts)
    }

    private startMessagesCooldownSub(){
        if(subIsActive(this.messagesCooldown)) return

        this.messagesCooldown = App.emitCurrentContact$.pipe(
            switchMap(contact => {
                Log.trace(`switching contacts for messages`, contact, LogTopic.CURRENT_CONTACT)
                return timer(0, config.messagesDaemon.frequency).pipe(
                    concatMap(() => Refresh.messages(this.cups, contact)),
                )
            }),
        ).subscribe(ms =>{
            App.$ingestMessages.next(ms as any)
        } )
    }
}

function subIsActive(sub: Subscription | undefined): boolean {
    return sub && !sub.closed
}