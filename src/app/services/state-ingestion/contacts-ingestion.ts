import { Subject, of, Observable } from 'rxjs'
import { CupsMessenger } from '../cups/cups-messenger'
import { ContactWithMessageCount } from '../cups/types'
import { catchError, filter, map, concatMap } from 'rxjs/operators'
import { Path } from './util'

// Returns a path which on trigger will return the most up to date contacts.
// multiple triggers will occur sequentially due to use of concatMap.
function path(cups: CupsMessenger): Path<{}, ContactWithMessageCount[]>{
    const $trigger$ = new Subject()
    const next = () => $trigger$.next()
    const observable = $trigger$.asObservable().pipe(concatMap(() => contactsProvider(cups)))
    return Object.assign(observable, { next })
}

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

export const RefreshContacts = { path }