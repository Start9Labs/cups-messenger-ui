import { globe } from '../global-state'
import { config } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage, ContactWithMessageCount } from '../cups/types'
import { interval,
         of,
         combineLatest,
         OperatorFunction,
        } from 'rxjs'
import { map, switchMap, filter } from 'rxjs/operators'
import { Injectable } from '@angular/core'
import { LongSubject } from './path-subject'

@Injectable({providedIn: 'root'})
export class AppDaemons {
    $showContacts$:         LongSubject<{},                               ContactWithMessageCount[]>
    $showContactMessages$:  LongSubject<{contact: Contact},               {contact: Contact, messages: ServerMessage[]}>

    constructor(cups: CupsMessenger){
        this.$showContacts$         = new LongSubject(showContactsOp(cups))
        this.$showContactMessages$  = new LongSubject(showContactMessagesOp(cups))
        this.init()
    }

    private init() {
        interval(config.contactsDaemon.frequency).subscribe(this.$showContacts$)
        combineLatest([
            interval(config.contactMessagesDaemon.frequency),
            globe.currentContact$.pipe(filter(c => !!c))
        ]).pipe(map(([_, c]) => ({contact: c}))).subscribe(this.$showContactMessages$)

        this.$showContacts$.subscribe(globe.$contacts$)
        this.$showContactMessages$.subscribe(globe.$observeServerMessages)
    }
}

export const intervalStr = frequency => interval(frequency).pipe(map(i => String(i)))

export const showContactsOp: (cups: CupsMessenger) => OperatorFunction<{}, ContactWithMessageCount[]> =
    cups => switchMap(() => cups.contactsShow().then(contacts => contacts.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages)))

export const showContactMessagesOp: (cups: CupsMessenger) => 
        OperatorFunction<{contact: Contact}, {contact: Contact, messages: ServerMessage[]}> =
    cups => switchMap(({contact}) => cups.messagesShow(contact).then(messages => ({contact, messages})))

export const sendMessageOp : (cups: CupsMessenger) => OperatorFunction<{contact: Contact, text: string}, { contact: Contact }> =
    cups => switchMap(({contact, text}) => cups.messagesSend(contact, text).then(() => ({contact})))

export const addContactOp : (cups: CupsMessenger) => OperatorFunction<{contact: Contact}, { contact: Contact }> =
    cups => switchMap(({contact}) => cups.contactsAdd(contact).then( _ => ({ contact })))
