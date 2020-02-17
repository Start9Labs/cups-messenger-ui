import { GlobalState, globe } from '../global-state'
// import { cryoProvider, CryoDaemonConfig, PyroDaemonConfig, pyroProvider } from './providers'
import { config } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage, ContactWithMessageCount } from '../cups/types'
import { Subscription, interval, Observable } from 'rxjs'
import { map, mergeMap } from 'rxjs/operators'


export function main(cups: CupsMessenger) {
    const c0: ContactsDaemonConfig = {
        frequency: config.contactsDaemon.frequency,
        cups
    }
    contactsProvider(c0).subscribe(globe.contacts$)

    let previousContactMessagesSub: Subscription
    globe.watchCurrentContact().subscribe(c => {
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

export interface ContactMessagesDaemonConfig { frequency: number, cups: CupsMessenger, contact: Contact }
export const contactMessagesProvider: (p: ContactMessagesDaemonConfig) => Observable<ServerMessage[]> = ({frequency, cups, contact}) =>
            interval(frequency)
            .pipe(
                mergeMap(() => cups.messagesShow(contact)),
            )

export interface ContactsDaemonConfig { frequency: number, cups: CupsMessenger }
export const contactsProvider: (p: ContactsDaemonConfig) => Observable<ContactWithMessageCount[]> = ({frequency, cups}) =>
            interval(frequency)
            .pipe(
                mergeMap(() => cups.contactsShow().handle(console.error)),
            )
