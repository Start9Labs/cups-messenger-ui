import { globe } from '../global-state'
import { config } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage, ContactWithMessageCount } from '../cups/types'
import { interval,
         of,
         combineLatest,
         OperatorFunction,
        } from 'rxjs'
import { map, switchMap, filter, catchError } from 'rxjs/operators'
import { Injectable } from '@angular/core'
import { PathSubject, compSub } from './path-subject'

@Injectable({providedIn: 'root'})
export class AppPaths {
    $showContacts$:         PathSubject<ShowContacts, ContactWithMessageCount[]>
    $showContactMessages$:  PathSubject<ContactMessages, {contact: Contact, messages: ServerMessage[]}>
    $sendMessage$:          PathSubject<SendMessage, { contact: Contact }>
    $addContact$:           PathSubject<AddContact, {contact: Contact}>

    constructor(cups: CupsMessenger){
        this.$showContacts$         = new PathSubject(showContactsPipe(cups))
        this.$showContactMessages$  = new PathSubject(showContactMessagesPipe(cups))
        this.$sendMessage$          = new PathSubject(sendMessagePipe(cups))
        this.$addContact$           = new PathSubject(addContactPipe(cups))
        this.init()
    }

    private init() {
        this.$showContacts$
            .subscribe(globe.$contacts$)
        this.$addContact$
            .subscribeM(globe.currentContact$, c => c.contact)
        compSub(this.$addContact$, this.$showContacts$)

        this.$showContactMessages$.subscribe(globe.$observeServerMessages)
        compSub(this.$sendMessage$, this.$showContactMessages$)

        combineLatest([intervalStr(config.contactsDaemon.frequency), of({})])
            .subscribe(this.$showContacts$)
        combineLatest([intervalStr(config.contactMessagesDaemon.frequency), globe.currentContact$.pipe(filter(c => !!c))])
            .pipe(
                map((([i , c]) => ([i, {contact: c}] as [string, {contact: Contact}]))),
                catchError(e => of(console.error(e)))
            )
            .subscribe(this.$showContactMessages$)
    }
}

export const intervalStr = frequency => interval(frequency).pipe(map(i => String(i)))

export type ShowContacts = {}
const showContactsPipe : (cups: CupsMessenger) => OperatorFunction<ShowContacts, ContactWithMessageCount[]> =
    cups => switchMap(() => cups.contactsShow().then(contacts => contacts.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages)))

export interface ContactMessages { contact: Contact }
const showContactMessagesPipe : (cups: CupsMessenger) => OperatorFunction<ContactMessages, {contact: Contact, messages: ServerMessage[]}> =
    cups => switchMap(({contact}) => cups.messagesShow(contact).then(messages => ({contact, messages})))

export interface SendMessage { contact: Contact, text: string }
const sendMessagePipe : (cups: CupsMessenger) => OperatorFunction<SendMessage, { contact: Contact }> =
    cups => switchMap(({contact, text}) => cups.messagesSend(contact, text).then(() => ({contact})))

export interface AddContact { contact: Contact }
const addContactPipe : (cups: CupsMessenger) => OperatorFunction<AddContact, { contact: Contact }> =
    cups => switchMap(({contact}) => cups.contactsAdd(contact).then( _ => ({ contact })))
