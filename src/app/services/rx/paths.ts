import { globe } from '../global-state'
import { config } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage, ContactWithMessageCount } from '../cups/types'
import { Subscription,
         interval,
         Observable,
         Subject,
         of,
         combineLatest,
         OperatorFunction,
         NextObserver,
         PartialObserver,
         race,
        } from 'rxjs'
import { map, mergeMap, take, filter, tap } from 'rxjs/operators'
import { Injectable } from '@angular/core'

@Injectable({providedIn: 'root'})
export class AppPaths {
    $showContacts$: PathSubject<ShowContacts, ContactWithMessageCount[]>
    $showContactMessages$ : PathSubject<ContactMessages, {contact: Contact, messages: ServerMessage[]}>
    $sendMessage$ : PathSubject<SendMessage, { contact: Contact }>
    $addContact$ : PathSubject<AddContact, {}>

    constructor(cups: CupsMessenger){
        this.$showContacts$         = new PathSubject(showContactsPipe(cups))
        this.$showContactMessages$  = new PathSubject(showContactMessagesPipe(cups))
        this.$sendMessage$          = new PathSubject(sendMessagePipe(cups))
        this.$addContact$           = new PathSubject(addContactPipe(cups))
        this.init()
    }

    private init() {
        this.$addContact$.subscribePath(this.$showContacts$)
        this.$showContacts$.subscribe(globe.$contacts$)

        this.$sendMessage$.subscribePath(this.$showContactMessages$)
        this.$showContactMessages$.subscribe(globe.$observeServerMessages)

        combineLatest([intervalStr(config.contactsDaemon.frequency), of({})])
            .subscribe(this.$showContacts$)
        combineLatest([intervalStr(config.contactMessagesDaemon.frequency), globe.currentContact$.pipe(filter(c => !!c))])
            .pipe(map((([i , c]) => ([i, {contact: c}] as [string, {contact: Contact}]))))
            .subscribe(this.$showContactMessages$)
    }
}

export const intervalStr = frequency => interval(frequency).pipe(map(i => String(i)))

export type ShowContacts = {}
const showContactsPipe : (cups: CupsMessenger) => OperatorFunction<ShowContacts, ContactWithMessageCount[]> =
    cups => mergeMap(() => cups.contactsShow().then(contacts => contacts.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages)))

export interface ContactMessages { contact: Contact }
const showContactMessagesPipe : (cups: CupsMessenger) => OperatorFunction<ContactMessages, {contact: Contact, messages: ServerMessage[]}> =
    cups => mergeMap(({contact}) => cups.messagesShow(contact).then(messages => ({contact, messages})))

export interface SendMessage { contact: Contact, text: string }
const sendMessagePipe : (cups: CupsMessenger) => OperatorFunction<SendMessage, { contact: Contact }> =
    cups => mergeMap(({contact, text}) => cups.messagesSend(contact, text).then(() => ({contact})))

export interface AddContact { contact: Contact }
const addContactPipe : (cups: CupsMessenger) => OperatorFunction<AddContact, {}> =
    cups => mergeMap(({contact}) => cups.contactsAdd(contact).then( _ => ({})))


export class PathSubject<S, T> implements NextObserver<[string, S]>{
    private readonly internalTrigger: Subject<[string, S]>
    readonly path: Observable<[string, T]>

    constructor(toPipe: OperatorFunction<S, T>) {
        this.internalTrigger = new Subject<[string, S]>()
        this.path = this.internalTrigger.pipe(
            mergeMap(([pid, s]) =>  of(s).pipe(toPipe, map(t => ([pid, t] as [string, T]))))
        )
    }

    next([pid, s]: [string, S]): void {
        this.internalTrigger.next([pid, s])
    }

    subscribe(o: PartialObserver<T>): Subscription {
        return this.path.pipe(map(([_, t]) => t)).subscribe(o)
    }

    subscribeToId(pid: string, next: (t: T) => void, timeout: number): Subscription {
        return race(
            this.path.pipe(filter(([id,s]) => id === pid)), interval(timeout)
        ).pipe(take(1)).subscribe(res => {
            if(res[0] === pid){
                next(res[1])
            } else {
                throw new Error(`${pid} timed out`)
            }
        })
    }

    subscribePath<U>(p : PathSubject<T, U>): Subscription {
        return this.path.subscribe(p)
    }
}
