import { globe } from '../global-state'
import { config, debugLog } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage, ContactWithMessageCount } from '../cups/types'
import { Observable, Subject, of, OperatorFunction, from, BehaviorSubject, combineLatest, merge } from 'rxjs'
import { map, catchError, filter, switchMap, delay, tap } from 'rxjs/operators'

export function main(cups: CupsMessenger) {
    const contactsDaemon = cooldown(
        prodContacts$,
        contactsProvider(cups),
        config.contactsDaemon.frequency
    )
    contactsDaemon.subscribe(globe.$observeContacts)

    const contactMessagesDaemon = cooldown(
        combineLatest([globe.currentContact$, prodContactMessages$]).pipe(map(([c,_]) => c)),
        contactMessagesProvider(cups),
        config.contactMessagesDaemon.frequency
    )

    contactMessagesDaemon.subscribe(globe.$observeMessages)
}

export const prodContactMessages$ = new Subject()
export interface ContactMessagesDaemonConfig { frequency: number, cups: CupsMessenger }
export const contactMessagesProvider: (cups: CupsMessenger) => OperatorFunction<Contact, { contact: Contact, messages: ServerMessage[] }> =
    cups => {
        return o => o.pipe(
            filter(c => !!c),
            tap(c => { console.log('contact messages daemon running for ' + c.torAddress) }),
            state(contact =>
                from(cups.messagesShow(contact, {/* TODO FIX THIS PLS */} as any)).pipe(
                    catchError(e => {
                        console.error(`Error in contact messages daemon ${e.message}`)
                        return of([])
                    })
                )
            ),
            map(([contact, messages]) => ({ contact, messages }))
        )
    }

export const prodContacts$ = new Subject()
export interface ContactsDaemonConfig { frequency: number, cups: CupsMessenger }
export const contactsProvider: (cups: CupsMessenger) => OperatorFunction<{}, ContactWithMessageCount[]> =
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

export function state<S,T>(forked: (s: S) => Observable<T> ): OperatorFunction<S,[S,T]> {
    return os => os.pipe(
        switchMap(s => forked(s).pipe(map(t => ([s,t] as [S, T]))) )
    )
}

function cooldown<S,T>(manualTrigger$: Observable<S>, f : OperatorFunction<S,T>, cd: number): Observable<T>{
    const trigger$ = new BehaviorSubject({})
    return merge(
        combineLatest([manualTrigger$, trigger$]).pipe(delay(cd), map(([s, _]) => s), f, tap(_ => trigger$.next({}))),
        manualTrigger$.pipe(f)
    )
}