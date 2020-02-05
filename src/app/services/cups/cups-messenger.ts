import { Injectable } from '@angular/core'
import { config } from '../../config'
import * as uuidv4 from 'uuid/v4'
import { HttpClient } from '@angular/common/http'
import { ContactWithMessageCount, Contact, Message, mockL, mockContact, mockMessage, pauseFor } from './types'
import { CupsResParser } from './cups-res-parser'

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
    constructor(private readonly http: HttpClient){}

    async contactsShow(): Promise<ContactWithMessageCount[]> {
        const arrayBuffer = await this.http.get<ArrayBuffer>(
            config.cupsMessenger.url, { params: { type: 'users' } }
        ).toPromise()
        return this.parser.contactsShow(arrayBuffer)
    }
    async contactsAdd(contact: Contact): Promise<void> {
        return
    }
    async messagesShow(contact: Contact, limit: number = 15): Promise<Message[]> {
        return []
    }
    async messagesSend(contact: Contact, message: string): Promise<void> {
        return
    }
}

export function pullContact(arrayBuffer: ArrayBuffer): any {
    const pkey = arrayBuffer.slice(0, 0 + 32)
    const unreadsCount = arrayBuffer.slice(32, 32 + 8)
    const nameLength = arrayBuffer.slice(32 + 8, 32 + 8 + 1)
    const name = "jon"
    return { pkey, unreadsCount, nameLength, name }
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

    
