import { Injectable } from '@angular/core'
import { config } from '../../config'
import * as uuidv4 from 'uuid/v4'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { ContactWithMessageCount, Contact, mockL, mockContact, mockMessage, pauseFor, ServerMessage, AttendingMessage, MessageBase } from './types'
import { CupsResParser, onionToPubkeyString } from './cups-res-parser'
import { globe } from '../global-state'

@Injectable({providedIn: 'root'})
export class CupsMessenger {
    private impl: LiveCupsMessenger | MockCupsMessenger
    constructor(http: HttpClient) {
        if (config.cupsMessenger.mock) {
            this.impl = new MockCupsMessenger()
        } else {
            this.impl = new LiveCupsMessenger(http)
        }
    }

    contactsShow(loginTestPassword?: string): Promise<ContactWithMessageCount[]> {
        return this.impl.contactsShow(loginTestPassword || globe.password)
    }

    contactsAdd(contact: Contact): Promise<void> {
        return this.impl.contactsAdd(contact)
    }

    async messagesShow(contact: Contact, limit: number = 15): Promise<ServerMessage[]> {
        return this.impl.messagesShow(contact, limit)
    }
    async messagesSend(contact: Contact, message: string): Promise<{id: string}> {
        console.log('sending message', message)
        return this.impl.messagesSend(contact, message)
    }
}

export class LiveCupsMessenger {
    private readonly parser: CupsResParser = new CupsResParser()
    constructor(private readonly http: HttpClient) {}

    private authHeaders(password: string = globe.password): HttpHeaders {
        if (!password) { throw new Error('Unauthenticated request to server attempted.') }
        console.log(`authing with`, password)
        return new HttpHeaders({Authorization: 'Basic ' + btoa(`me:${password}`)})
    }

    private get hostUrl(): string {
        return config.cupsMessenger.url
    }

    async contactsShow(loginTestPassword: string): Promise<ContactWithMessageCount[]> {
        console.log('showing with ', loginTestPassword)
        try {
            return this.http.get(
                this.hostUrl,
                {
                    params: {
                        type: 'users'
                    },
                    headers: this.authHeaders(loginTestPassword),
                    responseType: 'arraybuffer'
                }
            ).toPromise().then(arrayBuffer => this.parser.deserializeContactsShow(arrayBuffer))
        } catch (e) {
            console.error('Contacts show', e)
            throw e
        }
    }

    async contactsAdd(contact: Contact): Promise<void> {
        const toPost = this.parser.serializeContactsAdd(contact.torAddress, contact.name)
        return this.http.post<void>(
            this.hostUrl, new Blob([toPost]), {  headers: this.authHeaders() }
        ).toPromise()
    }

    async messagesShow(contact: Contact, limit: number = 15): Promise<ServerMessage[]> {
        try {
            const arrayBuffer = await this.http.get(
                    this.hostUrl,
                    {
                        params: {
                            type: 'messages',
                            pubkey: onionToPubkeyString(contact.torAddress),
                            limit: String(limit)
                        },
                        headers: this.authHeaders(),
                        responseType: 'arraybuffer'
                    }
            ).toPromise()

            return this.parser.deserializeMessagesShow(arrayBuffer).map(m =>
                ({...m, otherParty: contact, result: { id: m.id } })
            )
        } catch (e) {
            console.error('Messages show', e)
            console.error('Messages show', JSON.stringify(e))
            throw e
        }
    }

    async messagesSend(contact: Contact, message: string): Promise<{id: string}> {
        const toPost = this.parser.serializeSendMessage(contact.torAddress, message)
        return this.http.post<{id: string}>(
            this.hostUrl, new Blob([toPost]), {  headers: this.authHeaders() }
        ).toPromise()
    }
}

const mocks = {} // mockL(mockMessage, 2)

export class MockCupsMessenger {
    contacts = mockL(mockContact, 5)
    counter = 0

    constructor() {}

    async contactsShow(): Promise<ContactWithMessageCount[]> {
        if (this.counter % 5 === 0) {
            this.contacts[1].unreadMessages ++
        }
        return this.contacts
    }

    async contactsAdd(contact: Contact): Promise<void> {
        await pauseFor(2000)
        const nonMatchingTors = this.contacts.filter(c => c.torAddress !== contact.torAddress)
        this.contacts = []
        this.contacts.push(...nonMatchingTors)
        this.contacts.push(Object.assign({unreadMessages: 0}, contact))
    }

    async messagesShow(contact: Contact, limit: number = 15): Promise<ServerMessage[]> {
        this.counter++
        if (this.counter % 5 === 0) {
            if (this.counter % 10 === 0) {
                await pauseFor(2000)
            }
            this.getMessageMocks(contact).push(mockMessage(this.counter))
        }
        const toReturn = JSON.parse(
            JSON.stringify(
                this.getMessageMocks(contact)
            )).map(x => { x.timestamp = new Date(x.timestamp); return x }
        )
        return Promise.resolve(
            toReturn
        )
    }

    async messagesSend(contact: Contact, message: string): Promise< {id: string} > {
        await pauseFor(1000000)
        const id = uuidv4()
        this.getMessageMocks(contact).push({
            timestamp: new Date(),
            direction: 'Outbound',
            otherParty: contact,
            text: message,
            result: { id }
        })
        return { id }
    }

    private getMessageMocks(c: Contact): MessageBase[] {
        mocks[c.torAddress] = (mocks[c.torAddress] || mockL(mockMessage, 2))
        return mocks[c.torAddress]
    }
}