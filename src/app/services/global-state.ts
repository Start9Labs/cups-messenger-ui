import { Contact,
        ContactWithMessageCount,
        MessageBase,
        isServer,
       } from './cups/types'
import { BehaviorSubject, NextObserver, Observable, PartialObserver } from 'rxjs'
import { Plugins } from '@capacitor/core'
import { take } from 'rxjs/operators'
const { Storage } = Plugins

const passwordKey = { key: 'password' }

export class Globe {
    $contacts$: BehaviorSubject<ContactWithMessageCount[]> = new BehaviorSubject([])
    contactsPid$: BehaviorSubject<string> = new BehaviorSubject('')
    currentContact$: BehaviorSubject<Contact | undefined> = new BehaviorSubject(undefined)
    password: string | undefined = undefined
    contactMessages: {
        [contactTorAddress: string]: BehaviorSubject<MessageBase[]>
    } = {}

    constructor() {}

    observeContacts: PartialObserver<ContactWithMessageCount[]> = {
        next: contacts => {
            console.log(`nexting contacts`)
            if(contacts) {
                this.$contacts$.next(contacts)
            }
        },
    }

    $observeMessages: NextObserver<{ contact: Contact, messages: MessageBase[] }> = {
        next : ({contact, messages}) => {
            this.contactMessagesSubjects(contact.torAddress).pipe(take(1)).subscribe( existingMessages => {
                this.contactMessagesSubjects(contact.torAddress).next(
                    uniqueBy(messages.concat(existingMessages), t => t.trackingId, serverErrorAttending).sort(sortByTimestamp)
                )
            })
        }
    }

    watchMessages(c: Contact): Observable<MessageBase[]> {
        return this.contactMessagesSubjects(c.torAddress)
    }

    async init(): Promise<void> {
        return Storage.get(passwordKey).then(p => { this.password = p.value })
    }

    async setPassword(p: string): Promise<void> {
        return Storage.set({
            key: 'password',
            value: p
        }).then(() => this.init())
    }

    async clearPassword(): Promise<void> {
        Storage.remove(passwordKey)
        this.password = undefined
        return
    }

    private contactMessagesSubjects(tor: string): BehaviorSubject<MessageBase[]> {
        if(!this.contactMessages[tor]) { this.contactMessages[tor] = new BehaviorSubject([]) }
        return this.contactMessages[tor]
    }
}

export const globe = new Globe()

const sortByTimestamp =
    (a: MessageBase, b: MessageBase) => {
        const aT = isServer(a) ? a.timestamp : a.sentToServer
        const bT = isServer(b) ? b.timestamp : b.sentToServer
        return bT.getTime() - aT.getTime()
    }

function uniqueBy<T>(ts : T[], projection: (t: T) => string, prioritized: (t1: T, t2: T) => boolean): T[] {
    const tracking = { } as { [projected: string] : T }
    ts.forEach( t => {
        if(tracking[projection(t)] && prioritized(t, tracking[projection(t)])) {
            tracking[projection(t)] = t
        } else {
            tracking[projection(t)] = t
        }
    })
    return Object.values(tracking)
}


