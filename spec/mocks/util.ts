import { ContactWithMessageCount, ServerMessage, mkInbound } from 'src/app/services/cups/types'
import * as uuid from 'uuid'

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

export function mockMessage(i: number, dateOverride: Date = new Date(i * 1000 * 60 * 60 * 24 * 365)): ServerMessage {
    return mkInbound({
        direction: 'Inbound',
        otherParty: mockContact(i),
        text: i + '--' + mockL(mockWord, 3).join(' '),
        trackingId: uuid.v4(),
        id: uuid.v4(),
        timestamp: dateOverride
    })
}

function mockWord(i: number): string {
    return uuid.v4() + i
}
