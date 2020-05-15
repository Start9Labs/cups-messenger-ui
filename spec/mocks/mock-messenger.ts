import { ContactWithMessageCount, Contact, pauseFor, ServerMessage, ObservableOnce } from 'src/app/services/cups/types'
import * as uuid from 'uuid'
import { interval, of, timer } from 'rxjs'
import { tap, delay, map } from 'rxjs/operators'
import { fillDefaultOptions, ShowMessagesOptions } from 'src/app/services/cups/live-messenger'
import { Log } from 'src/app/log'

let contacts = mockL(mockContact, 5)

export class MockCupsMessenger {
    mocks: {[tor: string]: ServerMessage[]} = {}
    counter = 0
    constructor() {
        contacts.forEach( c => {
            this.mocks[c.torAddress] = mockL(mockMessage, 30)
        })
    }

    contactsShow (): ObservableOnce<ContactWithMessageCount[]> {
        Log.trace('showing contacts', contacts)
        return of(contacts)
    }

    contactsAdd (contact: Contact): ObservableOnce<void> {
        return timer(2000).pipe(map(() => {
            const nonMatchingTors = contacts.filter(c => c.torAddress !== contact.torAddress)
            this.mocks[contact.torAddress] = []
            contacts = nonMatchingTors.concat(Object.assign({ unreadMessages: 0 }, contact))
        }))
    }

    messagesShow (contact: Contact, options: ShowMessagesOptions): ObservableOnce<ServerMessage[]> {
        const { limit, offset } = fillDefaultOptions(options)
        const messages = this.getMessageMocks(contact)
        if(offset){
            const i = messages.findIndex(m => m.id && m.id === offset.id)
            switch(offset.direction){
                case 'after'  : return of(messages.slice(i + 1, i + 1 + limit))
                case 'before' : return of(messages.slice(i - limit, i))
            }
        } else {
            return of(messages.slice(messages.length - limit + 1, messages.length))
        }
    }

    newMessagesShow(contact: Contact): ObservableOnce<ServerMessage[]> {
        return of([])
    }

    messagesSend (contact: Contact, trackingId, message: string): ObservableOnce<void> {
        return of()
        // return timer(2000).pipe(map(
        //     () => {
        //         this.getMessageMocks(contact).push({
        //             timestamp: new Date(),
        //             sentToServer: new Date(),
        //             direction: 'Outbound',
        //             otherParty: contact,
        //             text: message,
        //             id: uuid.v4(),
        //             trackingId
        //         })
        //     }
        // ))
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
        unreadMessages: 3
    }
}
export function mockMessage(i: number): ServerMessage {
    return {
        direction: 'Inbound',
        otherParty: mockContact(i),
        text: i + '--' + mockL(mockWord, 3).join(' '),
        sentToServer: new Date(i * 1000 * 60 * 60 * 24 * 365),
        trackingId: uuid.v4(),
        id: uuid.v4(),
        timestamp: new Date(i * 1000 * 60 * 60 * 24 * 365),
        failure: undefined
    }
}
function mockWord(i: number): string {
    return uuid.v4() + i
}
