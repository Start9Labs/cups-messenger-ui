import { Observable, NextObserver } from 'rxjs'
import { ContactWithMessageCount, MessageBase, Contact, serverMessagesOverwriteAttending, inbound, outbound, ServerMessage, isServer } from '../cups/types'
import { filter, single, map } from 'rxjs/operators'
import { uniqueBy, sortByTimestamp } from 'src/app/util'
import * as uuid from 'uuid'
import { exists, LogBehaviorSubject } from '../rxjs/util'
import { LogLevel as L } from 'src/app/config'

const nillTrackingId = '00000000-0000-0000-0000-000000000000'

function trackingId<T extends { trackingId: string }>(t: T): string {
    return t.trackingId === nillTrackingId ? uuid.v4() : t.trackingId
}

// Raw app state. Shouldn't be accessed directly except by the below.
const Private = {
    $currentContact$: new LogBehaviorSubject<Contact>(L.INFO, undefined),
    $contacts$: new LogBehaviorSubject<ContactWithMessageCount[]>(L.DEBUG, []),
    messagesStore: {} as { [torAddress: string]: LogBehaviorSubject<MessageBase[]> },

    $messagesFor$: tor => {
        if(!this.messagesStore[tor]) { this.messagesStore[tor] = new LogBehaviorSubject(L.DEBUG, []) }
        return this.messagesStore[tor].asObservable()
    }
}

// Observers will have $prefix
// Observables will have suffix$
// Subjects will have both $subject$
export class AppState{
    $ingestCurrentContact:  NextObserver<Contact>
    $ingestContacts:  NextObserver<ContactWithMessageCount[]>
    $ingestMessages: NextObserver<{ contact: Contact, messages: MessageBase[] }>

    emitCurrentContact$: Observable<Contact> 
    emitContacts$: Observable<ContactWithMessageCount[]>
    emitMessages$: (tor: string) => Observable<MessageBase[]>

    constructor(){
        this.$ingestCurrentContact = Private.$currentContact$
        this.$ingestContacts       = Private.$contacts$
        this.$ingestMessages       = { next : ingestMessagesLogic }

        this.emitCurrentContact$ = Private.$currentContact$.asObservable().pipe(filter(exists))
        this.emitContacts$       = Private.$contacts$.asObservable()
        this.emitMessages$ = (tor: string) => Private.$messagesFor$(tor)
    }

    emitMostRecentServerMessage$(c: Contact): Observable<ServerMessage | undefined> {
        return this.emitMessages$(c.torAddress).pipe(map(ms => ms.filter(isServer)[0]))
    }

    emitOldestServerMessage$(c: Contact): Observable<ServerMessage | undefined> {
        return this.emitMessages$(c.torAddress).pipe(map(ms => ms.filter(isServer)[ms.length - 1]))
    }
}


function ingestMessagesLogic(s:  {contact: Contact, messages: MessageBase[] }){
    const {contact, messages} = s
    const messagesForContact$ = Private.$messagesFor$(contact.torAddress)
    messagesForContact$.pipe(single()).subscribe(existingMessages => {
        const inbounds  = uniqueBy(t => t.id, messages.concat(existingMessages).filter(inbound))

        const outbounds = uniqueBy(
            trackingId,
            messages.concat(existingMessages).filter(outbound),
            serverMessagesOverwriteAttending
        )

        const newMessageState = inbounds
            .concat(outbounds)
            .sort(sortByTimestamp)
        messagesForContact$.next(newMessageState)
    })
}

export const App = new AppState()