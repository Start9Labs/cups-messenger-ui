import { globe } from '../global-state'
import { config } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage, ContactWithMessageCount } from '../cups/types'
import { Subscription, interval, Observable, Subject, merge, of, combineLatest, zip, from } from 'rxjs'
import { map, mergeMap } from 'rxjs/operators'
import * as uuidv4 from 'uuid/v4'

export function main(cups: CupsMessenger) {
    const c0: ContactsDaemonConfig = {
        frequency: config.contactsDaemon.frequency,
        cups
    }
    contactsProvider(c0).subscribe(globe.contacts$)
    addContactFire(c0).subscribe(prodContacts$)

    let previousContactMessagesSub: Subscription
    let previousSendMessagesSub: Subscription
    globe.currentContact$.subscribe(c => {
        if(!c) return
        if (previousContactMessagesSub) { previousContactMessagesSub.unsubscribe() }
        if (previousSendMessagesSub) { previousSendMessagesSub.unsubscribe() }

        const c1 = {
            frequency: config.contactMessagesDaemon.frequency,
            cups,
            contact: c
        }

        previousContactMessagesSub = contactMessagesProvider(c1).subscribe(globe.observeServerMessages(c))
        previousSendMessagesSub = sendMessageFire(c1).subscribe(prodContactMessages$)
    })
}


export const prodContactMessages$ = new Subject()
export interface ContactMessagesDaemonConfig { frequency: number, cups: CupsMessenger, contact: Contact }
export const contactMessagesProvider: (p: ContactMessagesDaemonConfig) => Observable<ServerMessage[]> = ({frequency, cups, contact}) =>
            merge(interval(frequency), prodContactMessages$)
            .pipe(
                mergeMap(() => cups.messagesShow(contact))
            )

export const prodContacts$ = new Subject()
export interface ContactsDaemonConfig { frequency: number, cups: CupsMessenger }
export const contactsProvider: (p: ContactsDaemonConfig) => Observable<ContactWithMessageCount[]> = ({frequency, cups}) =>
            merge(interval(frequency), prodContacts$).pipe(
                mergeMap(() => { console.log('contacts'); return cups.contactsShow()}),
                map(contacts => contacts.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages))
            )

export const $prodSendMessage: Subject<SendMessage> = new Subject()
export interface SendMessage { contact: Contact, text: string }
export interface SendMessageConfig { cups: CupsMessenger }
export const sendMessageFire: (c: SendMessageConfig) => Observable<SendMessage> = ({cups}) =>
    $prodSendMessage.pipe(mergeMap(
        ({contact, text}) => cups.messagesSend(contact, text).then(() => ({contact, text}))
    ))

export const $prodAddContact: Subject<AddContact> = new Subject()
export interface AddContact { contact: Contact }
export interface AddContactConfig { cups: CupsMessenger }
export const addContactFire: (c: AddContactConfig) => Observable<string> = ({cups}) =>
    $prodAddContact.pipe(
        mergeMap(x => cups.contactsAdd(x.contact).then(() => x.contact.torAddress))
    )

// const uuidInterval : (f: number) => Observable<string> = frequency => interval(frequency).pipe(map(uuidv4))

// type Tracking<T> = [string, T]

export class TrackingSubject<T> {
    constructor(){}

    prod(pid: string, t: T): void {

    }
}