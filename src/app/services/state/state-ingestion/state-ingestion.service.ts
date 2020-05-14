import { config } from 'src/app/config'
import { CupsMessenger } from '../../cups/cups-messenger'
import { Subscription, Observable, interval } from 'rxjs'
import { concatMap, tap } from 'rxjs/operators'
import { App } from '../app-state'
import { cooldown } from '../../../../rxjs/util'
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
        this.contactsCooldown = cooldown(config.contactsDaemon.frequency, Refresh.contacts(this.cups))
            .pipe(tap(cs => Log.trace('contacts daemon running', cs)))
            .subscribe(App.$ingestContacts)
    }

    private startMessagesCooldownSub(){
        if(subIsActive(this.messagesCooldown)) return

        this.messagesCooldown = App.emitCurrentContact$.pipe(
            concatMap(contact =>
                cooldown(config.messagesDaemon.frequency, Refresh.messages(this.cups, contact))
            ),
            tap(ms => Log.trace('messages daemon running', ms))
        ).subscribe(ms =>{
            Log.trace(`In subscribe`, ms)
            App.$ingestMessages.next(ms as any)
        } )
    }
}

function subIsActive(sub: Subscription | undefined): boolean {
    return sub && !sub.closed
}