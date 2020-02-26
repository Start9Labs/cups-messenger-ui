import { globe } from '../global-state'
import { config, debugLog } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage, ContactWithMessageCount } from '../cups/types'
import { interval, Observable, Subject, of, Subscription, OperatorFunction, from, BehaviorSubject, combineLatest, merge } from 'rxjs'
import { map, catchError, filter, switchMap, delay, repeat, withLatestFrom, tap, take } from 'rxjs/operators'

let contactsSubscription: Subscription
let contactMessagesSubscription: Subscription
export function main(cups: CupsMessenger) {
    const contactsDaemon = cooldown(
        prodContacts$,
        contactsProvider(cups),
        config.contactsDaemon.frequency
    )
    contactsSubscription = contactsDaemon.subscribe(globe.$observeContacts)

    const contactMessagesDaemon = cooldown(
        combineLatest([globe.currentContact$, prodContactMessages$]).pipe(map(([c,_]) => c)),
        contactMessagesProvider(cups),
        config.contactMessagesDaemon.frequency
    )

    contactMessagesSubscription = contactMessagesDaemon.subscribe(globe.$observeMessages)

    interval(1000).pipe(filter(
        () => contactsSubscription.closed
    )).subscribe(() => {
        console.warn(`restarting contacts daemon`)
        contactsSubscription = contactsDaemon.subscribe(globe.$observeContacts)
    })

    interval(1000).pipe(filter(
        () => contactMessagesSubscription.closed
    )).subscribe(() => {
        console.warn(`restarting contact messages daemon`)
        contactMessagesSubscription = contactMessagesDaemon.subscribe(globe.$observeMessages)
    })
}

export const prodContactMessages$ = new Subject()
export interface ContactMessagesDaemonConfig { frequency: number, cups: CupsMessenger }
export const contactMessagesProvider: (cups: CupsMessenger) => OperatorFunction<Contact, { contact: Contact, messages: ServerMessage[] }> =
    cups => {
        return o => o.pipe(
            filter(c => !!c),
            state(contact => from(cups.messagesShow(contact, {/* TODO FIX THIS PLS */} as any))),
            map(([contact, messages]) => {
                debugLog(`contact messages: ${JSON.stringify(messages)}`)
                return ({ contact, messages })
            }),
            catchError(e => {
                console.error(`Error in contact messages daemon ${e.message}`)
                return of(undefined)
            }),
            filter(x => !!x),
        )
    }

export const prodContacts$ = new Subject()
export interface ContactsDaemonConfig { frequency: number, cups: CupsMessenger }
export const contactsProvider: (cups: CupsMessenger) => OperatorFunction<{}, ContactWithMessageCount[]> =
    cups => {
        return o => o.pipe(
            switchMap(() => cups.contactsShow()),
            map(contacts => {
                debugLog(`contacts: ${JSON.stringify(contacts)}`)
                return contacts.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages)
            }),
            catchError(e => {
                console.error(`Error in contacts daemon ${e.message}`)
                return of(undefined)
            }),
            filter(x => !!x),
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
        combineLatest([manualTrigger$, trigger$]).pipe(map(([s, _]) => s), f, delay(cd), tap(_ => trigger$.next({}))),
        manualTrigger$.pipe(f)
    )
}