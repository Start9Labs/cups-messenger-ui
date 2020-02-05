import { Injectable } from '@angular/core'
import { config } from '../../config'
import * as uuidv4 from 'uuid/v4'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { ContactWithMessageCount, Contact, Message, mockL, mockContact, mockMessage, pauseFor } from './types'
import { CupsResParser, onionToPubkeyString } from './cups-res-parser'
import { GlobalState } from '../global-state'

@Injectable({providedIn: 'root'})
export class CupsMessenger {
    private impl: LiveCupsMessenger | MockCupsMessenger
    constructor(globe: GlobalState, http: HttpClient) {
        if (config.cupsMessenger.mock) {
            this.impl = new MockCupsMessenger()
        } else {
            this.impl = new LiveCupsMessenger(globe, http)
        }
    }

    async contactsShow(): Promise<ContactWithMessageCount[]> {
        return this.impl.contactsShow()
    }
    async contactsAdd(contact: Contact): Promise<void> {
        return this.impl.contactsAdd(contact)
    }
    async messagesShow(contact: Contact, limit: number = 15): Promise<Message[]> {
        return this.impl.messagesShow(contact, limit)
    }
    async messagesSend(contact: Contact, message: string): Promise<void> {
        return this.impl.messagesSend(contact, message)
    }
}

export class LiveCupsMessenger {
    private readonly parser : CupsResParser = new CupsResParser()
    constructor(private readonly globe: GlobalState,private readonly http: HttpClient){}

    private get authHeaders(): HttpHeaders {
        if(!this.globe.password) throw new Error('Unauthenticated request to server attempted.')
        return new HttpHeaders({"Authorization": "Basic " + btoa(`me:${this.globe.password}`)});
    }

    private get hostUrl(): string {
        if(!this.globe.password) throw new Error('Unauthenticated request to server attempted.')
        return `http://` + config.cupsMessenger.url + "/"
    }

    async contactsShow(): Promise<ContactWithMessageCount[]> {
        try {
            const arrayBuffer = await this.http.get<ArrayBuffer>(
                this.hostUrl, { params: { type: 'users' }, headers: this.authHeaders }
            ).toPromise()
            return this.parser.deserializeContactsShow(arrayBuffer)
        } catch (e) {
            console.error(e)
            throw e
        }
    }

    async contactsAdd(contact: Contact): Promise<void> {
        const toPost = this.parser.serializeContactsAdd(contact.torAddress, contact.name)
        return this.http.post<void>(
            this.hostUrl, toPost, {  headers: this.authHeaders }
        ).toPromise()
    }

    async messagesShow(contact: Contact, limit: number = 15): Promise<Message[]> {
        const arrayBuffer = await this.http.get<ArrayBuffer>(
            this.hostUrl, { params: { 
                type: 'messages', 
                pubkey: onionToPubkeyString(contact.torAddress), 
                limit: String(limit) 
                },
                headers: this.authHeaders
            }
        ).toPromise()
        return this.parser.deserializeMessagesShow(arrayBuffer)
    }

    async messagesSend(contact: Contact, message: string): Promise<void> {
        const toPost = this.parser.serializeSendMessage(contact.torAddress, message)
        return this.http.post<void>(
            this.hostUrl, toPost, {  headers: this.authHeaders }
        ).toPromise()
    }
}

export class MockCupsMessenger {
    contacts = mockL(mockContact, 5)
    messages = mockL(mockMessage, 20)
    counter = 0

    async contactsShow(): Promise<ContactWithMessageCount[]> {
        if (this.counter % 5 === 0) {
            this.contacts[1].unreadMessages ++
        }
        return this.contacts
    }
    async contactsAdd(contact: Contact): Promise<void> {
        const nonMatchingTors = this.contacts.filter(c => c.torAddress !== contact.torAddress)
        this.contacts = []
        debugger
        this.contacts.push(...nonMatchingTors)
        this.contacts.push(Object.assign({unreadMessages: 0}, contact))
    }

    async messagesShow(contact: Contact, limit: number = 15): Promise<Message[]> {
        this.counter = 1
        if (this.counter % 5 === 0) {
            if(this.counter % 10 === 0) {
                console.log('gonna pause')
                await pauseFor(2000)
            }

           this.messages.push(mockMessage(this.counter))
        }

        if(this.counter % 8 === 0) {
            await pauseFor(2000)
            console.log('gonna timeout')
            throw new Error('timeout')
        }
        return Promise.resolve(this.messages)
    }
    async messagesSend(contact: Contact, message: string): Promise<void> {
        this.messages.push({
            timestamp: new Date(),
            direction: 'Outbound',
            otherParty: contact,
            text: message,
            id: uuidv4()
        })
    }
}

    
