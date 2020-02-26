import { Contact,
        ContactWithMessageCount,
        MessageBase,
        isServer,
        serverErrorAttendingPrioritization,
        ServerMessage,
       } from './cups/types'
import { BehaviorSubject, NextObserver, Observable, Subject } from 'rxjs'
import { Plugins } from '@capacitor/core'
import { take, map } from 'rxjs/operators'
import { debugLog } from '../config'
import * as uuid from 'uuid'

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

    $observeContacts: NextObserver<ContactWithMessageCount[]> = {
        next: contacts => {
            this.$contacts$.pipe(take(1)).subscribe(cs => {
                debugLog(`contacts state updating: ${contacts}`)
                const csMap = {}
                cs.forEach(c => csMap[c.torAddress] = c)
                contacts.forEach(c => csMap[c.torAddress] = c)
                this.$contacts$.next(Object.values(csMap))
            })
        },
        error: e => {
            console.error(`subscribed contacts error: `, e)
        }
    }

    $observeMessages: NextObserver<{ contact: Contact, messages: MessageBase[] }> = {
        next : ({contact, messages}) => {
            this.contactMessagesSubjects(contact.torAddress).pipe(take(1)).subscribe(existingMessages => {
                debugLog(`existingMessages: ${existingMessages}`)
                const inbound  = uniqueBy(messages.concat(existingMessages).filter(m => m.direction === 'Inbound'), t => t.id)
                const outbound = uniqueBy(
                    messages.concat(existingMessages).filter(m => m.direction === 'Outbound'),
                    t => t.trackingId === nillTrackingId ? uuid.v4() : t.trackingId,
                    serverErrorAttendingPrioritization
                )
                const newMessageState = inbound.concat(outbound).sort(sortByTimestamp)
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

function uniqueBy<T>(ts : T[], projection: (t: T) => string, prioritized: (t1: T, t2: T) => boolean = (t1, t2) => true): T[] {
    const tracking = { } as { [projected: string] : T }
    ts.forEach( t => {
        if( (tracking[projection(t)] && prioritized(t, tracking[projection(t)])) || !tracking[projection(t)]) {
            tracking[projection(t)] = t
        }
    })
    return Object.values(tracking)
}


const nillTrackingId = '00000000-0000-0000-0000-000000000000'