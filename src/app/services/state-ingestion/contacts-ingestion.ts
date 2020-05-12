import { Subject, of, Observable } from 'rxjs'
import { CupsMessenger } from '../cups/cups-messenger'
import { ContactWithMessageCount } from '../cups/types'
import { catchError, filter, map, mergeMap } from 'rxjs/operators'
import { Path } from './util'

function path(cups: CupsMessenger): Path<{}, ContactWithMessageCount[]>{
    const $trigger$ = new Subject()
    const next = () => $trigger$.next()
    const observable = $trigger$.asObservable().pipe(mergeMap(() => contactsProvider(cups)))
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