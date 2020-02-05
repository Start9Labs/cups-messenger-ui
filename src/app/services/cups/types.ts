import * as uuidv4 from 'uuid/v4'

export function pauseFor(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export interface Contact {
    torAddress: string;
    name?: string;
}

export interface ContactWithMessageCount extends Contact {
    unreadMessages: number;
}

export type MessageDirection = 'Inbound' | 'Outbound';
export interface Message {
    id: string;
    timestamp: Date;
    direction: MessageDirection;
    otherParty: Contact;
    text: string;
}


// Mocks //

export function mockL<T>(mockF: (arg0: number) => T, i: number): T[] {
    const toReturn = [];
    for (let j = 0; j < i; j++) {
        toReturn.push(mockF(j));
    }
    return toReturn;
}
export function mockContact(i: number): ContactWithMessageCount {
    return {
        torAddress: 'someTorAddr' + i + 'blahbalhfaosdfj.onion',
        name: 'contact-' + i + 'dfoifd',
        unreadMessages: 0
    };
}
export function mockMessage(i: number): Message {
    return {
        timestamp: new Date(),
        direction: 'Inbound',
        otherParty: mockContact(i),
        text: mockL(mockWord, 30).join(' '),
        id: uuidv4()
    };
}
function mockWord(i: number): string {
    return uuidv4() + i;
}
