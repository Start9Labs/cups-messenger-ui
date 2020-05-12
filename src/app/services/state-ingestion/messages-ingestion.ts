import { Subject, of, Observable } from 'rxjs'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage } from '../cups/types'
import { filter, catchError, map, concatMap, mergeMap } from 'rxjs/operators'
import { ShowMessagesOptions } from '../cups/live-messenger'
import { Path } from './util'

// Returns a path which on trigger with a contact will return the most up to date messages for that contact.
// multiple triggers will occur asynchronously due to use of mergeMap.
// this allows one to get messages for multiple contacts without waiting for previous calls to complete
function path(cups: CupsMessenger): Path<Contact,{ contact: Contact, messages: ServerMessage[] }> {
    const $trigger$ = new Subject() as Subject<Contact>
    const next = c => $trigger$.next(c)
    const observable = $trigger$.asObservable().pipe(mergeMap(contact => messagesProvider(cups, contact)))
    return Object.assign(observable, { next })
}

function messagesProvider(cups: CupsMessenger, contact: Contact): Observable<{ contact: Contact, messages: ServerMessage[] }> {
    return cups.messagesShow(contact, { /* TODO: PAGINATION LOGIC GOES HERE */} as ShowMessagesOptions).pipe(
        catchError(e => {
            console.error(`Error in contacts ingestion ${e.message}`)
            return of(null)
        }),
        filter(ms => !!ms),
        map(messages => ({ contact, messages }))
    )
}

export const RefreshMessages = {
    path
}