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
import { getContext } from 'ambassador-sdk'
import { debugLog } from '../config'
import * as uuid from 'uuid'

const { Storage } = Plugins

const passwordKey = { key: 'password' }

export class Globe {
    // TODO: delete this. Log in this way because we miss the init logs in safari debug cause I can't open it in time.
    tempLog: [Date, string,string][] = []
    $contacts$: BehaviorSubject<ContactWithMessageCount[]> = new BehaviorSubject([])
    contactsPid$: BehaviorSubject<string> = new BehaviorSubject('')
    currentContact$: BehaviorSubject<Contact | undefined> = new BehaviorSubject(undefined)
    password$: Subject<string | undefined> = new Subject()
    password: string | undefined = undefined
    contactMessages: {
        [contactTorAddress: string]: BehaviorSubject<MessageBase[]>
    } = {}

    constructor() {
        // TODO: delete this
        // tslint:disable-next-line: no-string-literal
        window['getContext'] = getContext
        this.password$.subscribe(p => { this.password = p })
    }

    $observeContacts: NextObserver<ContactWithMessageCount[]> = {
        next: contacts => {
            debugLog(`contacts state updating: ${JSON.stringify(contacts, null, '\t')}`)
            this.$contacts$.next(contacts)
        },
        error: e => {
            console.error(`subscribed contacts error: `, e)
        }
    }

    $observeMessages: NextObserver<{ contact: Contact, messages: MessageBase[] }> = {
        next : ({contact, messages}) => {
            debugLog(`new message state updating : ${JSON.stringify(messages, null, '\t')}`)
            this.contactMessagesSubjects(contact.torAddress).pipe(take(1)).subscribe(existingMessages => {
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
        this.toTempLog(`initting global-state`)
        // If we've logged in and never logged out...
        const storedPassword = await Storage.get(passwordKey)
        this.toTempLog(`Stored password`, storedPassword)
        if(storedPassword && storedPassword.value){
            this.password$.next(storedPassword.value)
            return
        }

        // If we've logged in via cups-shell...
        // Get the password from shell, save it to storage
        this.toTempLog(`window.platform`, (window as any).platform)
        if((window as any).platform) {
            this.toTempLog(`about to check config...`)
            try {
                const c = getContext()
                this.toTempLog(`context`, c)
                const shellPassword = await c.getConfigValue(['password'], 5000)
                this.toTempLog(`Shell password`, shellPassword)
                if(shellPassword){
                    await Storage.set({
                        key: 'password',
                        value: shellPassword
                    })
                    this.password$.next(shellPassword)
                    return
                }
            } catch(e) {
                this.toTempLog('failed getting shell password', e)
            }
        }

        // Otherwise we're not logged in, this will trigger arrival on the signin page
        this.password$.next(undefined)
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
        // getContext clear password somehow?
        this.password$.next(undefined)
    }

    private contactMessagesSubjects(tor: string): BehaviorSubject<MessageBase[]> {
        if(!this.contactMessages[tor]) { this.contactMessages[tor] = new BehaviorSubject([]) }
        return this.contactMessages[tor]
    }

    // TODO: delete all of these
    private toTempLog(s: string, thing?: any){
        try {
            this.tempLog.push([new Date(), s, JSON.stringify(thing)])
        } catch (e) {
            this.tempLog.push([new Date(), s, thing])
        }
    }

    // TODO: delete
    public flushLogs(){
        console.log(this.tempLog)
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