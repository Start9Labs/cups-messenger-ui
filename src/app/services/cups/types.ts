import * as uuidv4 from 'uuid/v4'

export function pauseFor(ms: number): Promise<void> {
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
export type DisplayMessage = ServerMessage | AttendingMessage
export interface MessageBase {
    id: string
    direction: MessageDirection
    otherParty: Contact
    text: string
    attending: boolean
    timestamp: Date
}
export interface ServerMessage extends MessageBase {
    attending: false
}
export interface AttendingMessage extends MessageBase {
    attending: true
    direction: 'Outbound'
    failed: boolean
    attemptedAt: Date
}
export interface FailedMessage extends AttendingMessage {
    failed: true
}

export function serverMessageFulfills(s: ServerMessage | AttendingMessage, a: AttendingMessage): boolean {
    if (s.direction !== a.direction) { return false }
    if (s.otherParty.torAddress !== a.otherParty.torAddress) { return false }
    if (s.text !== a.text) { return false }
    return true
}

export function attendingMessageFulfills(s: AttendingMessage, a: AttendingMessage): boolean {
    if (s.direction !== a.direction) { return false }
    if (s.otherParty.torAddress !== a.otherParty.torAddress) { return false }
    if (s.text !== a.text) { return false }
    if (s.attemptedAt !== a.attemptedAt) { return false }
    return true
}

// Mocks //

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
        timestamp: new Date(),
        direction: 'Inbound',
        otherParty: mockContact(i),
        text: mockL(mockWord, 10).join(' '),
        id: uuidv4(),
        attending: false
    }
}
function mockWord(i: number): string {
    return uuidv4() + i
}
