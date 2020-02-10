import { Injectable } from '@angular/core'
import { Contact, DisplayMessage, ContactWithMessageCount, ServerMessage, AttendingMessage, serverMessageFulfills } from "./cups/types"
import { BehaviorSubject, Observable } from 'rxjs'
import { Plugins } from '@capacitor/core'
import { DeltaSubject } from './delta-subject'
import { map } from 'rxjs/operators'
const { Storage } = Plugins

const passwordKey = { key: 'password' }

export type CategorizedMessages = { server: ServerMessage[], attending: AttendingMessage[] }

@Injectable({providedIn: 'root'})
export class GlobalState {
    public password: string | undefined
    public contacts$: BehaviorSubject<ContactWithMessageCount[]> = new BehaviorSubject([])
    public currentContact$: BehaviorSubject<Contact | undefined> = new BehaviorSubject(undefined)
    displayMessages: { 
        [contactTorAddress: string]: DeltaSubject<CategorizedMessages>
    } = {}

    constructor() {}

    //Subscribe to these...
    watchAllContactMessages(c: Contact): Observable<DisplayMessage[]> {
        return this.getCategorizedContactMessages$(c).watch().pipe(
            map( ({server, attending}) => 
                (attending.sort(orderTimestampDescending) as DisplayMessage[]).concat(server.sort(orderTimestampDescending) as DisplayMessage[])
            )
        )
    }

    watchContacts(): Observable<ContactWithMessageCount[]> {
        return this.contacts$.pipe(
            map(cs => cs.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages))
        )
    }

    watchCurrentContact(): Observable<Contact | undefined> {
        return this.currentContact$
    }

    //Notify subscribers with these...
    pokeServerMessages(c: Contact, newServerMessagesState: ServerMessage[]): void {
        const displayMessages = this.getCategorizedContactMessages$(c)

        const { server, attending } = displayMessages.getValue()

        const mostRecentServerMessageSoFar = server.sort(orderTimestampDescending)[0] ? new Date(server.sort(orderTimestampDescending)[0].timestamp).getTime() : new Date(0)
        const serverDiff = newServerMessagesState.filter(
            newestMessage => new Date(newestMessage.timestamp).getTime() > mostRecentServerMessageSoFar
        )

        let newAttendingState = JSON.parse(JSON.stringify(attending))
        serverDiff.forEach( newServerMessage => {
            const i = newAttendingState.findIndex(presentAttending => serverMessageFulfills(newServerMessage, presentAttending))
            newAttendingState.splice(i, 1)
        })

        this.displayMessages[c.torAddress].deltaPoke({ server: newServerMessagesState, attending: newAttendingState })
    }

    pokeAppendAttendingMessage(c: Contact, a: AttendingMessage): void {
        const displayMessages = this.getCategorizedContactMessages$(c)
        const { attending } = displayMessages.getValue()
        const newAttending = JSON.parse(JSON.stringify(attending))
        this.displayMessages[c.torAddress].deltaPoke({ attending: newAttending.concat(a) })
    }

    pokeContacts(cs: ContactWithMessageCount[]): void {
        this.contacts$.next(cs)
    }

    pokeNewContact(c: Contact): void {
        const current = this.contacts$.getValue()
        current.push({...c, unreadMessages: 0})
        this.contacts$.next(current)
    }

    pokeCurrentContact(c: Contact): void {
        this.currentContact$.next(c)
    }

    //Misc

    logState(log: string, c: Contact): void {
        if(this.displayMessages[c.torAddress]) {
            const {server, attending} = this.displayMessages[c.torAddress].getValue()
            console.log(log, {t: new Date(), server: server.length, attending: attending.length})
        } else {
            console.log(log, {t: new Date(), server: 0, attending: 0})
        }
        
    }

    getCurrentContact(): Contact | undefined {
        return this.currentContact$.getValue()
    }

    init(): Promise<void> {
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
    }

    private getCategorizedContactMessages$(c : Contact): DeltaSubject<CategorizedMessages>{
        this.displayMessages[c.torAddress] = this.displayMessages[c.torAddress] || new DeltaSubject({ server: [], attending: [] })
        return this.displayMessages[c.torAddress]
    }
}

export const orderTimestampDescending: (a: {timestamp: Date}, b: {timestamp: Date}) => number 
    = (a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    }
