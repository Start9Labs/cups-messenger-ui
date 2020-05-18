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
export interface Message {
    direction: MessageDirection
    otherParty: Contact
    text: string
    trackingId?: string // Set for all outbound guys
    sentToServer?: Date // Set for all outbound guys
    id?: string // Set only for all server guys (Inbounds and Sents)
    timestamp?: Date // Set only for all server guys (Inbounds and Sents)
    failure?: string // Set for failures only.
}

export interface OutboundMessage extends Message {
    direction: 'Outbound'
    sentToServer: Date
}
export function outbound(t: Message): t is OutboundMessage {
    return !!t.sentToServer && t.direction === 'Outbound'
}

export interface ServerMessage extends Message {
    id: string
    timestamp: Date
    failure: undefined
}
export function server(t: Message) : t is ServerMessage {
    return !!t.id && !!t.timestamp && !t.failure
}

export interface InboundMessage extends ServerMessage {
    direction: 'Inbound' // trackingId is usually undefined
}
export function inbound(t: Message): t is InboundMessage {
    return t.direction === 'Inbound' && server(t)
}

export interface AttendingMessage extends OutboundMessage {
    id: undefined,
    timestamp: undefined,
    failure: undefined
}
export function attending(t: Message) : t is AttendingMessage {
    return !t.id && !t.timestamp && !t.failure && outbound(t)
}

export interface FailedMessage extends OutboundMessage {
    failure: string
    id: undefined
    timestamp: undefined
}
export function failed(t: Message) : t is FailedMessage {
    return !!t.failure && !t.id && !t.timestamp && outbound(t)
}


export interface SentMessage extends OutboundMessage , ServerMessage {
    direction: 'Outbound'  // outbound
    sentToServer: Date     // outbound
    failure: undefined     // server
    id: string             // server
    timestamp: Date        // server
}
export function sent(t: Message) : t is SentMessage {
    return outbound(t) && server(t)
}

export type ObservableOnce<T> = Observable<T>