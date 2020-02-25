import { globe } from '../global-state'
import { config } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage, ContactWithMessageCount } from '../cups/types'
import { interval, Observable, Subject, merge, combineLatest, of, Subscription, OperatorFunction } from 'rxjs'
import { map, catchError, filter, switchMap } from 'rxjs/operators'

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

    contactsSubscription = contactsProvider(c0).subscribe(globe.$contacts$)
    contactMessagesSubscription = contactMessagesProvider(c1).subscribe(globe.$observeMessages)

    interval(1000).pipe(filter(
        () => contactsSubscription.closed
    )).subscribe(() => {
        console.warn(`restarting contacts daemon`)
        contactsSubscription = contactsProvider(c0).subscribe(globe.$contacts$)
    })

    interval(1000).pipe(filter(
        () => contactMessagesSubscription.closed
    )).subscribe(() => {
        console.warn(`restarting contact messages daemon`)
        contactMessagesSubscription = contactMessagesProvider(c1).subscribe(globe.$observeMessages)
    })
}

export const prodContactMessages$ = new Subject()
export interface ContactMessagesDaemonConfig { frequency: number, cups: CupsMessenger }
export const contactMessagesProvider: (p: ContactMessagesDaemonConfig)
    => Observable<{contact: Contact, messages: ServerMessage[]}> = ({frequency, cups}) =>
        combineLatest([globe.currentContact$, interval(frequency), prodContactMessages$])
        .pipe(
            filter(([contact]) => !!contact),
            switchMap(([contact]) =>
                of(contact).pipe(
                    switchMap(() => cups.messagesShow(contact, {/* TODO FIX THIS PLS */} as any)),
                    map(messages => ({ contact, messages })),
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
    => Observable<ContactWithMessageCount[]> = ({frequency, cups}) =>
        merge(interval(frequency), prodContacts$)
        .pipe(
            switchMap(() => cups.contactsShow()),
            map(contacts => {
                console.log('mapping contacts')
                return contacts.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages)
            }),
            catchError(e => {
                console.error(`Error in contacts daemon ${e.message}`)
                return of(undefined)
            }),
            filter(x => !!x)
        )

export function state<S,T>(forked: (s: S) => Observable<T> ): OperatorFunction<S,[S,T]> {
    return os => os.pipe(
        switchMap( s => forked(s).pipe(map(t => ([s,t] as [S, T]))) )
    )
}