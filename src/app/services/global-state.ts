import { Contact,
        ContactWithMessageCount,
        MessageBase,
        isServer,
        serverErrorAttendingPrioritization,
        ServerMessage,
       } from './cups/types'
import { BehaviorSubject, NextObserver, Observable, PartialObserver, Subject } from 'rxjs'
import { Plugins } from '@capacitor/core'
import { take, map } from 'rxjs/operators'
const { Storage } = Plugins

const passwordKey = { key: 'password' }

export class Globe {
    $contacts$: BehaviorSubject<ContactWithMessageCount[]> = new BehaviorSubject([])
    contactsPid$: BehaviorSubject<string> = new BehaviorSubject('')
    currentContact$: BehaviorSubject<Contact | undefined> = new BehaviorSubject(undefined)
    password$: Subject<string | undefined> = new Subject()
    password: string | undefined = undefined
    contactMessages: {
        [contactTorAddress: string]: BehaviorSubject<MessageBase[]>
    } = {}

    constructor() {
        this.password$.subscribe(p => { this.password = p })
    }

    $observeMessages: NextObserver<{ contact: Contact, messages: MessageBase[] }> = {
        next : ({contact, messages}) => {
            this.contactMessagesSubjects(contact.torAddress).pipe(take(1)).subscribe(existingMessages => {
                console.log(existingMessages)
                const newMessageState = uniqueBy(
                    messages.concat(existingMessages),
                    t => t.trackingId,
                    serverErrorAttendingPrioritization
                ).sort(sortByTimestamp)
                this.contactMessagesSubjects(contact.torAddress).next(newMessageState)
            })
        }
    }

    watchMessages(c: Contact): Observable<MessageBase[]> {
        return this.contactMessagesSubjects(c.torAddress)
    }

    watchMostRecentServerMessage(c: Contact): Observable<ServerMessage | undefined> {
        return this.watchMessages(c).pipe(map(ms => ms.filter(isServer)[0]))
    }

    watchOldestServerMessage(c: Contact): Observable<ServerMessage | undefined> {
        return this.watchMessages(c).pipe(map(ms => ms.filter(isServer)[ms.length - 1]))
    }

    async init(): Promise<void> {
        const p = await Storage.get(passwordKey)
        this.password$.next(p.value)
    }

    async setPassword(p: string): Promise<void> {
        if(!p) return
        await Storage.set({
            key: 'password',
            value: p
        })
        this.init()
    }

    async clearPassword(): Promise<void> {
        await Storage.remove(passwordKey)
        this.password$.next(undefined)
    }

    private contactMessagesSubjects(tor: string): BehaviorSubject<MessageBase[]> {
        if(!this.contactMessages[tor]) { this.contactMessages[tor] = new BehaviorSubject([]) }
        return this.contactMessages[tor]
    }
}

export const globe = new Globe()

export const sortByTimestamp =
    (a: MessageBase, b: MessageBase) => {
        const aT = isServer(a) ? a.timestamp : a.sentToServer
        const bT = isServer(b) ? b.timestamp : b.sentToServer
        return bT.getTime() - aT.getTime()
    }

function uniqueBy<T>(ts : T[], projection: (t: T) => string, prioritized: (t1: T, t2: T) => boolean): T[] {
    const tracking = { } as { [projected: string] : T }
    ts.forEach( t => {
        if( (tracking[projection(t)] && prioritized(t, tracking[projection(t)])) || !tracking[projection(t)]) {
            tracking[projection(t)] = t
        }
    })
    return Object.values(tracking)
}


