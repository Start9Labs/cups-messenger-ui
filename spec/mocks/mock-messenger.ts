import { ContactWithMessageCount, Contact, pauseFor, ServerMessage } from 'src/app/services/cups/types'
import * as uuidv4 from 'uuid'
import { interval } from 'rxjs'
import { tap } from 'rxjs/operators'
import { fillDefaultOptions, ShowMessagesOptions } from 'src/app/services/cups/live-messenger'


export class MockCupsMessenger {
    mocks: {[tor: string]: ServerMessage[]} = {}
    contacts = mockL(mockContact, 5)
    counter = 0
    constructor() {
        this.contacts.forEach( c => {
            this.mocks[c.torAddress] = mockL(mockMessage, 30)
        })

        interval(5000).pipe(tap(() => {
            this.contacts.forEach( c => {
                const mockMessages = this.mocks[c.torAddress]
                mockMessages.push(mockMessage(mockMessages.length))
            })
        })).subscribe(() => console.log('added messages'))
    }

    async contactsShow (): Promise<ContactWithMessageCount[]> {
        return this.contacts
    }

    async contactsAdd (contact: Contact): Promise<void> {
        await pauseFor(2000)
        const nonMatchingTors = this.contacts.filter(c => c.torAddress !== contact.torAddress)
        this.contacts = []
        this.contacts.push(...nonMatchingTors)
        this.contacts.push(Object.assign({ unreadMessages: 0 }, contact))
    }

    async messagesShow (contact: Contact, options: ShowMessagesOptions): Promise<ServerMessage[]> {
        const { limit, offset } = fillDefaultOptions(options)

        const messages = this.getMessageMocks(contact)
        if(offset){
            const i = messages.findIndex(m => m.id && m.id === offset.id)
            switch(offset.direction){
                case 'after' : return messages.slice(i + 1, i + 1 + limit)
                case 'before' : return messages.slice(i - limit, i)
            }
        } else {
            return messages.slice(messages.length - limit + 1, messages.length)
        }
    }

    async newMessagesShow(contact: Contact): Promise<ServerMessage[]> {
        return []
    }

    async messagesSend (contact: Contact, trackingId, message: string): Promise<void> {
        await pauseFor(2000)
        this.getMessageMocks(contact).push({
            timestamp: new Date(),
            sentToServer: new Date(),
            direction: 'Outbound',
            otherParty: contact,
            text: message,
            id: uuidv4(),
            trackingId
        })
    }
    private getMessageMocks (c: Contact): ServerMessage[] {
        return JSON.parse(
            JSON.stringify(
                this.mocks[c.torAddress]
            )
        ).map(x => { x.timestamp = new Date(x.timestamp); return x })
    }
}

export function mockL<T>(mockF: (arg0: number) => T, i: number): T[] {
    const toReturn = []
    for (let j = 0; j < i; j++) {
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
export function mockMessage(i: number): ServerMessage {
    return {
        direction: 'Inbound',
        otherParty: mockContact(i),
        text: i + '--' + mockL(mockWord, 3).join(' '),
        sentToServer: new Date(i * 1000 * 60 * 60 * 24 * 365),
        trackingId: uuidv4(),
        id: uuidv4(),
        timestamp: new Date(i * 1000 * 60 * 60 * 24 * 365),
        failure: undefined
    }
}
function mockWord(i: number): string {
    return uuidv4() + i
}
