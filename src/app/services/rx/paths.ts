import { globe } from '../global-state'
// import { cryoProvider, CryoDaemonConfig, PyroDaemonConfig, pyroProvider } from './providers'
import { config } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage, ContactWithMessageCount } from '../cups/types'
import { interval, Observable, Subject, merge, combineLatest, of, Subscribable, Subscription } from 'rxjs'
import { map, catchError, filter, switchMap, take, takeWhile, tap } from 'rxjs/operators'

let contactsSubscription: Subscription
let contactMessagesSubscription: Subscription
export function main(cups: CupsMessenger) {
    const c0: ContactsDaemonConfig = {
        frequency: config.contactsDaemon.frequency,
        cups
    }

    const c1: ContactMessagesDaemonConfig = {
        frequency: config.contactMessagesDaemon.frequency,
        cups
    }

    contactsSubscription = contactsProvider(c0).subscribe(globe.observeContacts)
    contactMessagesSubscription = contactMessagesProvider(c1).subscribe(globe.$observeServerMessages)

    interval(1000).pipe(filter(
        () => contactsSubscription.closed
    )).subscribe(() => {
        console.warn(`restarting contacts daemon`)
        contactsSubscription = contactsProvider(c0).subscribe(globe.observeContacts)
    })

    interval(1000).pipe(filter(
        () => contactMessagesSubscription.closed
    )).subscribe(() => {
        console.warn(`restarting contact messages daemon`)
        contactMessagesSubscription = contactMessagesProvider(c1).subscribe(globe.$observeServerMessages)
    })
}




export const prodMessageContacts$ = new Subject()
export interface ContactMessagesDaemonConfig { frequency: number, cups: CupsMessenger }
export const contactMessagesProvider: (p: ContactMessagesDaemonConfig)
    => Observable<{contact: Contact, messages: ServerMessage[]}>
        = ({frequency, cups}) =>
                combineLatest([globe.currentContact$, interval(frequency), prodMessageContacts$])
                .pipe(
                    filter(([contact]) => !!contact),
                    switchMap(([contact]) =>
                        of(contact).pipe(
                            switchMap(() => cups.messagesShow(contact)),
                            map(messages => { console.log('mapping messages') ; return { contact, messages }}),
                            catchError(e => {
                                console.error(`Error in contact messages daemon ${e.message}`)
                                return of(undefined)
                            }),
                        )
                    ),
                )

export const prodContacts$ = new Subject()
export interface ContactsDaemonConfig { frequency: number, cups: CupsMessenger }
export const contactsProvider: (p: ContactsDaemonConfig)
    => Observable<ContactWithMessageCount[]>
        = ({frequency, cups}) =>
                merge(interval(frequency), prodContacts$)
                .pipe(
                    switchMap(() => cups.contactsShow()),
                    tap((res) => `received contacts from daemon 1 ${res}`),
                    map(contacts => { 
                        console.log('mapping contacts' , JSON.stringify(contacts))
                        return contacts.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages)
                    }),
                    catchError(e => {
                        console.error(`Error in contacts daemon ${e.message}`)
                        return of(undefined)
                    }),
                )