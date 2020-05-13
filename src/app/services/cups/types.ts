import { Observable } from 'rxjs'

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
    sentToServer?: Date
    id?: string
    timestamp?: Date
    failure?: string
}
export interface ServerMessage extends MessageBase {
    id: string, timestamp: Date, failure?: undefined
}
export interface AttendingMessage extends MessageBase {
    id?: undefined, timestamp?: undefined, failure?: undefined, sentToServer: Date
    direction: 'Outbound'
}
export interface FailedMessage extends MessageBase {
    id?: undefined, timestamp?: undefined, failure: string, sentToServer: Date
    direction: 'Outbound'
}

export function outbound(t: MessageBase): boolean {
    return t.direction === 'Outbound'
}

export function inbound(t: MessageBase): boolean {
    return t.direction === 'Inbound'
}

export function isServer(t: MessageBase) : t is ServerMessage {
    return !! (t.id && t.timestamp)
}

export function isFailed(t: MessageBase) : t is ServerMessage {
    return !! (t.direction === 'Outbound' && t.failure)
}

export function isAttending(t: MessageBase) : t is AttendingMessage {
    return !! (t.direction === 'Outbound' && !isServer(t) && !isFailed(t))
}

export function serverMessagesOverwriteAttending(m1 : MessageBase, m2: MessageBase): boolean {
    if(isServer(m1)) return true
    return m1.sentToServer > m2.sentToServer
}

export type ObservableOnce<T> = Observable<T>