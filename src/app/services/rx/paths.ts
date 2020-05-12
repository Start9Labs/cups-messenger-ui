import { config } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { PartialObserver, Subject } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { RefreshContacts } from '../state-ingestion/contacts-ingestion'
import { RefreshMessages } from '../state-ingestion/messages-ingestion'
import { State } from '../state/contact-messages-state'
import { cooldown } from '../state-ingestion/util'
import { Contact } from '../cups/types'


export function main(cups: CupsMessenger): {
    $refreshContactsTrigger: PartialObserver<{}>,
    $refreshMessagesTrigger: PartialObserver<Contact>,
} {
    // init State to always ingest new contacts emitted by refreshing the contacts.
    const $refreshContactsTrigger$ = RefreshContacts.path(cups)
    $refreshContactsTrigger$.subscribe(State.$ingestContacts)

    cooldown(config.contactsDaemon.frequency, RefreshContacts.path(cups)).subscribe(State.$ingestContacts)
    // init State to always ingest new contacts emmitted by 
    // RefreshContacts.onCooldown(config.contactsDaemon.frequency, cups).subscribe(State.$ingestContacts)

    const $refreshMessagesTrigger$ =  RefreshMessages.path(cups)
    $refreshMessagesTrigger$.subscribe(State.$ingestMessages)

    State.emitCurrentContact$.pipe(
        concatMap(contact =>
            cooldown(config.contactsDaemon.frequency, RefreshMessages.path(cups))
        )
    ).subscribe(State.$ingestMessages)

    return {
        $refreshContactsTrigger: $refreshContactsTrigger$,
        $refreshMessagesTrigger: $refreshMessagesTrigger$
    }
}





// export const prodContactMessages$ = new Subject()
// export interface ContactMessagesDaemonConfig { frequency: number, cups: CupsMessenger }
// export const contactMessagesProvider: (cups: CupsMessenger) => OperatorFunction<Contact, { contact: Contact, messages: ServerMessage[] }> =
//     cups => {
//         return o => o.pipe(
//             filter(c => !!c),
//             tap(c => { console.log('contact messages daemon running for ' + c.torAddress) }),
//             state(contact =>
//                 from(cups.messagesShow(contact, {/* TODO FIX THIS PLS */} as any)).pipe(
//                     catchError(e => {
//                         console.error(`Error in contact messages daemon ${e.message}`)
//                         return of([])
//                     })
//                 )
//             ),
//             map(([contact, messages]) => ({ contact, messages }))
//         )
//     }

// export const prodContacts$ = new Subject()
// export interface ContactsDaemonConfig { frequency: number, cups: CupsMessenger }
// export const contactsProvider: (cups: CupsMessenger) => OperatorFunction<{}, ContactWithMessageCount[]> =
//     cups => {
//         return o => o.pipe(
//             tap(() => console.log('contact daemon running')),
//             switchMap(() => from(cups.contactsShow()).pipe(
//                 catchError(e => {
//                     console.error(`Error in contacts daemon ${e.message}`)
//                     return of(null)
//                 })
//             )),
//             filter(cs => !!cs),
//             map(contacts => contacts.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages))
//         )
//     }

// export function state<S,T>(forked: (s: S) => Observable<T> ): OperatorFunction<S,[S,T]> {
//     return os => os.pipe(
//         switchMap(s => forked(s).pipe(map(t => ([s,t] as [S, T]))) )
//     )
// }

// export function cooldown<S,T>(manualTrigger$: Observable<S>, f : OperatorFunction<S,T>, cd: number): Observable<T>{
//     const trigger$ = new BehaviorSubject({})
//     return merge(
//         combineLatest([manualTrigger$, trigger$]).pipe(delay(cd), map(([s, _]) => s), f, tap(_ => trigger$.next({}))),
//         manualTrigger$.pipe(f)
//     )
// }