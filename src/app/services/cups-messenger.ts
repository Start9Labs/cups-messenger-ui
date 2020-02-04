import { Injectable } from '@angular/core'
import { config } from '../config'
import * as uuidv4 from 'uuid/v4'
import { timeout } from 'rxjs/operators'

@Injectable({providedIn: 'root'})
export class CupsMessenger {
    private impl: LiveCupsMessenger | MockCupsMessenger
    constructor() {
        if (config.cupsMessenger.mock) {
            this.impl = new MockCupsMessenger()
        } else {
            this.impl = new LiveCupsMessenger()
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
    async contactsShow(): Promise<ContactWithMessageCount[]> {
        return []
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

export function pauseFor (ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export interface Contact {
    torAddress: string
    name?: string
}

export interface ContactWithMessageCount extends Contact {
    unreadMessages: number
}

export type MessageDirection = 'Inbound' | 'Outbound'
export interface Message {
    id: string
    timestamp: Date
    direction: MessageDirection
    otherParty: Contact
    text: string
}

function mockL<T>(mockF: (arg0: number) => T, i: number): T[] {
    const toReturn = []
    for (let j = 0; j < i ; j++) {
        toReturn.push(mockF(j))
    }
    return toReturn
}

export function mockContact(i: number): ContactWithMessageCount {
    return {
        torAddress: 'someTorAddr' + i + 'blahbalhfaosdfj.onion',
        name: 'contact-' + i + 'dfoifd',
        unreadMessages: 0
    }
}

function mockMessage(i: number): Message {
    return {
        timestamp: new Date(),
        direction: 'Inbound',
        otherParty: mockContact(i),
        text: mockL(mockWord, 30).join(' '),
        id: uuidv4()
    }
}

function mockWord(i: number): string {
    return uuidv4() + i
}
