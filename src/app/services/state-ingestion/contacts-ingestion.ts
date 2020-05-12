import { Subject, of, Observable, OperatorFunction, from } from 'rxjs'
import { CupsMessenger } from '../cups/cups-messenger'
import { ContactWithMessageCount } from '../cups/types'
import { catchError, filter, map, tap, switchMap } from 'rxjs/operators'
import { cooldown } from './util'

export const prodContacts$ = new Subject()
export interface ContactsDaemonConfig { frequency: number, cups: CupsMessenger }


export const contactsDaemon: (conf: ContactsDaemonConfig) => Observable<ContactWithMessageCount[]> =
    ({ frequency, cups }) => cooldown(frequency, contactsProvider(cups))

function contactsProvider(cups: CupsMessenger): Observable<ContactWithMessageCount[]> {
    return cups.contactsShow().pipe(
        catchError(e => {
            console.error(`Error in contacts ingestion ${e.message}`)
            return of(null)
        }),
        filter(cs => !!cs),
        map(contacts => contacts.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages))
    )
}
