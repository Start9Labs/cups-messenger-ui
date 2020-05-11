import { Subject, of, Observable, OperatorFunction, from } from 'rxjs'
import { CupsMessenger } from '../cups/cups-messenger'
import { ContactWithMessageCount } from '../cups/types'
import { catchError, filter, map, tap, switchMap } from 'rxjs/operators'

export const prodContacts$ = new Subject()
export interface ContactsDaemonConfig { frequency: number, cups: CupsMessenger }


// export const prodContacts$ = new Subject()
export interface ContactsDaemonConfig { frequency: number, cups: CupsMessenger }
export const contactsProvider2: (cups: CupsMessenger) => OperatorFunction<{}, ContactWithMessageCount[]> =
    cups => {
        return o => o.pipe(
            tap(() => console.log('contact daemon running')),
            switchMap(() => from(cups.contactsShow()).pipe(
                catchError(e => {
                    console.error(`Error in contacts daemon ${e.message}`)
                    return of(null)
                })
            )),
            filter(cs => !!cs),
            map(contacts => contacts.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages))
        )
    }


export function contactsProvider(cups: CupsMessenger): Observable<ContactWithMessageCount[]> {
    return cups.contactsShow().pipe(
        catchError(e => {
            console.error(`Error in contacts ingestion ${e.message}`)
            return of(null)
        }),
        filter(cs => !!cs),
        map(contacts => contacts.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages))
    )
}
