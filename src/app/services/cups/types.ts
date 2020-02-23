import * as uuidv4 from 'uuid/v4'
import { Message } from '@angular/compiler/src/i18n/i18n_ast'

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
    direction: MessageDirection
    otherParty: Contact
    text: string
    trackingId: string
    sentToServer: Date
    id?: string
    timestamp?: Date
    failure?: string
}
export interface ServerMessage extends MessageBase {
    id: string, timestamp: Date, failure?: undefined
}
export interface AttendingMessage extends MessageBase {
    id?: undefined, timestamp?: undefined, failure?: undefined
    direction: 'Outbound'
}
export interface FailedMessage extends MessageBase {
    id?: undefined, timestamp?: undefined, failure: string
    direction: 'Outbound'
}

export function isServer(t: MessageBase) : t is ServerMessage {
    return !!t.id && !!t.timestamp
}

export function isFailed(t: MessageBase) : t is ServerMessage {
    return !!t.failure && t.direction === 'Outbound'
}

export function isAttending(t: MessageBase) : t is AttendingMessage {
    return !t.id && !t.timestamp && !t.failure && t.direction === 'Outbound'
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
        text: mockL(mockWord, 10).join(' '),
        sentToServer: new Date(),
        trackingId: uuidv4(),
        id: uuidv4(),
        timestamp: new Date(),
        failure: undefined
    }
}
function mockWord(i: number): string {
    return uuidv4() + i
}

export function serverErrorAttendingPrioritization(m1 : MessageBase, m2: MessageBase): boolean {
    if(isServer(m1)) return true
    if(isFailed(m1) && isAttending(m2)) return true
    return false
}