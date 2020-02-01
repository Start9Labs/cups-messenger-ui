import { Injectable } from '@angular/core'
import { config } from '../config'

@Injectable({providedIn: 'root'})
export class CupsMessenger {
    private impl: LiveCupsMessenger | MockCupsMessenger
    constructor() {
        if(config.cupsMessenger.mock){
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

    async contactsShow(): Promise<ContactWithMessageCount[]> {
        return this.contacts
    }
    async contactsAdd(contact: Contact): Promise<void> {
        this.contacts.push(Object.assign(contact, {unreadMessages: 0}))
    }
    async messagesShow(contact: Contact, limit: number = 15): Promise<Message[]> {
        console.log(this.messages.length)
        return Promise.resolve(this.messages)
    }
    async messagesSend(contact: Contact, message: string): Promise<void> {
        this.messages.push({
            timestamp: new Date(),
            direction: 'Outbound',
            otherParty: contact,
            text: message
        })
        return
    }
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
        name: 'contact-' + i,
        unreadMessages: 0
    }
}

function mockMessage(i: number): Message {
    return {
        timestamp: new Date(),
        direction: 'Inbound',
        otherParty: mockContact(i),
        text: mockL(mockWord, 30).join(' ')
    }
}

function mockWord(i: number): string {
    const k = i % 6 + 1
    let toReturn = ''
    for (let j = 0; j < k; j ++) {
        toReturn += 'a'
    }
    return toReturn
}
