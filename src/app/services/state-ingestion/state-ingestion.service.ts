import { config } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { Subscription, Observer, PartialObserver } from 'rxjs'
import { concatMap } from 'rxjs/operators'
import { RefreshContacts } from './contacts-ingestion'
import { RefreshMessages } from './messages-ingestion'
import { State } from '../state/contact-messages-state'
import { cooldown, at } from './util'
import { Injectable } from '@angular/core'
import { Contact } from '../cups/types'

@Injectable({providedIn: 'root'})
export class StateIngestion {
    private contactsCooldown: Subscription
    private messagesCooldown: Subscription
    private contactsByHand: Subscription
    private messagesByHand: Subscription
    private $contactsByHandTrigger: PartialObserver<{}> =
        {next: _ => console.warn('$contactsByHandTrigger not yet initialized')}
    private $messagesByHandTrigger: PartialObserver<Contact> =
        {next: _ => console.warn('$messagesByHandTrigger not yet initialized')}

    refreshContacts(){
        this.$contactsByHandTrigger.next({})
    }

    refreshMessages(contact: Contact){
        this.$messagesByHandTrigger.next(contact)
    }

    constructor(private readonly cups: CupsMessenger){
    }

    // idempotent
    // can be used to restart any dead subs.
    init(){
        this.startContactsByHandSub()
        this.startMessagesByHandSub()
        this.startContactsCooldownSub()
        this.startMessagesCooldownSub()
    }

    shutdown(){
        if(this.contactsCooldown) this.contactsCooldown.unsubscribe()
        if(this.messagesCooldown) this.messagesCooldown.unsubscribe()
        if(this.contactsByHand  ) this.contactsByHand.unsubscribe()
        if(this.messagesByHand  ) this.messagesByHand.unsubscribe()
    }

    private startContactsByHandSub(){
        if(subIsActive(this.contactsByHand)) return

        const $refreshContactsPath$ = RefreshContacts.path(this.cups)
        this.contactsByHand = $refreshContactsPath$.subscribe(State.$ingestContacts)
        this.$contactsByHandTrigger = $refreshContactsPath$
    }

    private startMessagesByHandSub(){
        if(subIsActive(this.messagesByHand)) return

        const $refreshMessagesPath$ =  RefreshMessages.path(this.cups)
        this.messagesByHand = $refreshMessagesPath$.subscribe(State.$ingestMessages)
        this.$messagesByHandTrigger = $refreshMessagesPath$
    }

    private startContactsCooldownSub(){
        if(subIsActive(this.contactsCooldown)) return

        this.contactsCooldown = cooldown(config.contactsDaemon.frequency, RefreshContacts.path(this.cups)).subscribe(State.$ingestContacts)
    }

    private startMessagesCooldownSub(){
        if(subIsActive(this.messagesCooldown)) return

        this.messagesCooldown = State.emitCurrentContact$.pipe(
            concatMap(contact =>
                cooldown(config.contactsDaemon.frequency, at(contact, RefreshMessages.path(this.cups)))
            )
        ).subscribe(State.$ingestMessages)
    }
}

function subIsActive(sub: Subscription | undefined): boolean {
    return sub && !sub.closed
}