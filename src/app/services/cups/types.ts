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
    result:         { id: string, timestamp: Date } | { error: string, id: string } |
            Promise<{ id: string, timestamp: Date } | { error: string, id: string }>
}
export interface ServerMessage extends MessageBase {
    result: {id: string, timestamp: Date}
}
export interface AttendingMessage extends MessageBase {
    result: Promise<{id: string, timestamp: Date} | {error: string, id: string}>
    direction: 'Outbound'
}
export interface FailedMessage extends MessageBase {
    result: {error : string, id: string}
    direction: 'Outbound'
}

export function isServer(t: MessageBase) : t is ServerMessage {
    return t.result && (t.result as any).timestamp
}

export function isFailed(t: MessageBase) : t is ServerMessage {
    return t.result && (t.result as any).error
}

export function isAttending(t: MessageBase) : t is AttendingMessage {
    return !isServer(t) && !isFailed(t)
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
        result: {id: uuidv4(), timestamp: new Date()}
    }
}
function mockWord(i: number): string {
    return uuidv4() + i
}
