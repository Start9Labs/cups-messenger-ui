import { of, Observable } from 'rxjs'
import { CupsMessenger } from '../../cups/cups-messenger'
import { ContactWithMessageCount } from '../../cups/types'
import { catchError, filter, map, concatMap } from 'rxjs/operators'
import { Contact, ServerMessage } from '../../cups/types'
import { ShowMessagesOptions } from '../../cups/live-messenger'

function contacts(cups: CupsMessenger): Observable<ContactWithMessageCount[]> {
    return cups.contactsShow().pipe(
        catchError(e => {
            console.error(`Error in contacts ingestion ${e.message}`)
            return of(null)
        }),
        filter(cs => !!cs),
        map(cs => cs.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages))
    )
}

function messages(cups: CupsMessenger, contact: Contact): Observable<{ contact: Contact, messages: ServerMessage[] }> {
    return cups.messagesShow(contact, { /* TODO: PAGINATION LOGIC GOES HERE */} as ShowMessagesOptions).pipe(
        catchError(e => {
            console.error(`Error in contacts ingestion ${e.message}`)
            return of(null)
        }),
        filter(ms => !!ms),
        map(ms => ({ contact, messages: ms }))
    )
}

export const Refresh = {
    messages, contacts
}