import { globe, sortByTimestamp } from '../global-state'
import { config } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage, ContactWithMessageCount, isServer } from '../cups/types'
import { interval, Observable, Subject, merge, combineLatest, of, Subscription, from } from 'rxjs'
import { map, catchError, filter, switchMap, tap, mergeMap } from 'rxjs/operators'

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
    contactMessagesSubscription = contactMessagesProvider(c1).subscribe(globe.$observeMessages)

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
        contactMessagesSubscription = contactMessagesProvider(c1).subscribe(globe.$observeMessages)
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


async function syncMessages(
    cups: CupsMessenger,
    c: Contact,
    mostRecentServerMessage: ServerMessage | undefined
) : Promise<ServerMessage[]> {
    const limit = 15

    const res = await (mostRecentServerMessage ?
        cups.messagesShow(c, { limit, offsetDirection: 'after', offsetId: mostRecentServerMessage.id }) :
        cups.messagesShow(c, { limit }))

    const sorted = res.sort(sortByTimestamp)
    if(res.length >= limit){
        return (await syncMessages(cups, c,  sorted[0])).concat(sorted)
    } else {
        return Promise.resolve(sorted)
    }
}