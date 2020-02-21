import { globe } from '../global-state'
// import { cryoProvider, CryoDaemonConfig, PyroDaemonConfig, pyroProvider } from './providers'
import { config } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage, ContactWithMessageCount } from '../cups/types'
import { interval, Observable, Subject, merge, combineLatest, of } from 'rxjs'
import { map, catchError, filter, switchMap } from 'rxjs/operators'

export function main(cups: CupsMessenger) {
    const c0: ContactsDaemonConfig = {
        frequency: config.contactsDaemon.frequency,
        cups
    }
    contactsProvider(c0).subscribe(globe.$contacts$)

    const c1: ContactMessagesDaemonConfig = {
        frequency: config.contactMessagesDaemon.frequency,
        cups
    }

    contactMessagesProvider(c1).subscribe(globe.$observeServerMessages)
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
                            map(messages => ({ contact, messages })),
                            catchError(e => {
                                console.error(`Error in contact messages daemon ${e.message}`)
                                return of(undefined)
                            }),
                        )
                    ),
                    filter(res => !!res)
                )

export const prodContacts$ = new Subject()
export interface ContactsDaemonConfig { frequency: number, cups: CupsMessenger }
export const contactsProvider: (p: ContactsDaemonConfig)
    => Observable<ContactWithMessageCount[]>
        = ({frequency, cups}) =>
                merge(interval(frequency), prodContacts$)
                .pipe(
                    switchMap(() => cups.contactsShow()),
                    map(contacts => contacts.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages)),
                    catchError(e => {
                        console.error(`Error in contacts daemon ${e.message}`)
                        return of(undefined)
                    }),
                    filter(res => !!res)
                )