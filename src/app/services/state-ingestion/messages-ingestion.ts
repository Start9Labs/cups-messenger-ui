import { Subject, of, Observable } from 'rxjs'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage } from '../cups/types'
import { filter, catchError, map, mergeMap } from 'rxjs/operators'
import { ShowMessagesOptions } from '../cups/live-messenger'
import { Path } from './util'

function path(cups: CupsMessenger): Path<Contact,{ contact: Contact, messages: ServerMessage[] }> {
    const $trigger$ = new Subject() as Subject<Contact>
    const next = () => $trigger$.next()
    const observable = $trigger$.asObservable().pipe(mergeMap(contact => messagesProvider(cups)(contact)))
    return Object.assign(observable, { next })
}

function messagesProvider(cups: CupsMessenger): (contact: Contact) => Observable<{ contact: Contact, messages: ServerMessage[] }> {
    return contact => {
        return cups.messagesShow(contact, {} as ShowMessagesOptions).pipe(
            catchError(e => {
                console.error(`Error in contacts ingestion ${e.message}`)
                return of(null)
            }),
            filter(ms => !!ms),
            map(messages => ({ contact, messages }))
        )
    }
}

export const RefreshMessages = {
    path
}