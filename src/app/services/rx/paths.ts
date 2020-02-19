import { GlobalState, globe } from '../global-state'
// import { cryoProvider, CryoDaemonConfig, PyroDaemonConfig, pyroProvider } from './providers'
import { config } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage, ContactWithMessageCount } from '../cups/types'
import { Subscription, interval, Observable, Subject, merge } from 'rxjs'
import { map, mergeMap } from 'rxjs/operators'

export function main(cups: CupsMessenger) {
    const c0: ContactsDaemonConfig = {
        frequency: config.contactsDaemon.frequency,
        cups
    }
    contactsProvider(c0).subscribe(globe.contacts$)

    let previousContactMessagesSub: Subscription
    globe.watchCurrentContact().subscribe(c => {
        if(!c) return
        if (previousContactMessagesSub) { previousContactMessagesSub.unsubscribe() }

        const c1 = {
            frequency: config.contactMessagesDaemon.frequency,
            cups,
            contact: c
        }

        previousContactMessagesSub = contactMessagesProvider(c1)
            .subscribe(globe.subscribeContactMessages(c))
    })
}


export const prodMessageContacts$ = new Subject()
export interface ContactMessagesDaemonConfig { frequency: number, cups: CupsMessenger, contact: Contact }
export const contactMessagesProvider: (p: ContactMessagesDaemonConfig) => Observable<ServerMessage[]> = ({frequency, cups, contact}) =>
            merge(interval(frequency), prodMessageContacts$, sendMessageFire({cups}))
            .pipe(
                mergeMap(() => cups.messagesShow(contact)),
            )

export const prodContacts$ = new Subject()
export interface ContactsDaemonConfig { frequency: number, cups: CupsMessenger }
export const contactsProvider: (p: ContactsDaemonConfig) => Observable<ContactWithMessageCount[]> = ({frequency, cups}) =>
            merge(interval(frequency), prodContacts$)
            .pipe(
                mergeMap(() => cups.contactsShow().handle(console.error)),
                map(contacts => contacts.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages))
            )

export const $prodSendMessage: Subject<SendMessage> = new Subject()
export interface SendMessage { contact: Contact, text: string }
export interface SendMessageConfig { cups: CupsMessenger }
export const sendMessageFire: (c: SendMessageConfig) => Observable<void> = ({cups}) => 
    $prodSendMessage.pipe(mergeMap(
        ({contact, text}) => cups.messagesSend(contact, text)
    ))