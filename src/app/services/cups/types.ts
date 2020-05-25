import { Observable } from 'rxjs'

export function pauseFor(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export interface Contact {
    torAddress: string
    name?: string
}
export interface ContactWithMessageMeta extends Contact {
    unreadMessages: number
    lastMessages: ServerMessage[]
}

export type MessageClassification = 'Inbound' | 'Sent' | 'Attending' | 'Failed'
export type MessageDirection = 'Inbound' | 'Outbound'
export interface MessageCore {
    direction: MessageDirection
    otherParty: Contact
    text: string
    classification: MessageClassification
}

export type ServerMessage = InboundMessage | SentMessage
export function server(m : Message): m is ServerMessage {
    return inbound(m) || sent(m)
}

export type LocalMessage = AttendingMessage | FailedMessage
export function local(m : Message): m is LocalMessage {
    return failed(m) || attending(m)
}

export type OutboundMessage = SentMessage | AttendingMessage | FailedMessage
export function outbound(m : Message): m is OutboundMessage {
    return sent(m) || attending(m) || failed(m)
}

export interface InboundMessage extends MessageCore {
    id: string
    timestamp: Date
    classification: 'Inbound'
    direction: 'Inbound'
    trackingId?: string // Technically inbound messages have trackingIds, but they're all 0s. They should be ignored.
}
export function inbound(t: Message): t is InboundMessage {
    return t.classification === 'Inbound' && t.direction === 'Inbound' && !!t.id && !!t.timestamp
}
export function mkInbound(t: Omit<InboundMessage, 'classification'>): InboundMessage {
    const toReturn = {...t, classification: 'Inbound' as 'Inbound'}
    if(inbound(toReturn)) return toReturn
    throw new Error(`Invalid inbound message ${t}`)
}

export interface SentMessage extends MessageCore {
    id: string
    timestamp: Date
    trackingId: string
    classification: 'Sent'
    direction: 'Outbound'
}
export function sent(t: Message): t is SentMessage {
    return t.classification === 'Sent' && !!t.trackingId && t.direction === 'Outbound' && !!t.id && !!t.timestamp
}
export function mkSent(t: Omit<SentMessage, 'classification'>): SentMessage {
    const toReturn = {...t, classification: 'Sent' as 'Sent'}
    if(sent(toReturn)) return toReturn
    throw new Error(`Invalid sent message ${t}`)
}


export interface AttendingMessage extends MessageCore {
    sentToServer: Date
    classification: 'Attending'
    direction: 'Outbound'
    trackingId: string
}
export function attending(t: Message): t is AttendingMessage {
    return t.classification === 'Attending' && !!t.trackingId && t.direction === 'Outbound' && !!t.sentToServer
}
export function mkAttending(t: Omit<AttendingMessage, 'classification'>): AttendingMessage {
    const toReturn = {...t, classification: 'Attending' as 'Attending'}
    if(attending(toReturn)) return toReturn
    throw new Error(`Invalid attending message ${t}`)
}


export interface FailedMessage extends MessageCore {
    failure: string
    sentToServer: Date
    classification: 'Failed'
    direction: 'Outbound'
    trackingId: string
}
export function failed(t: Message): t is FailedMessage {
    return t.classification === 'Failed' && !!t.trackingId && t.direction === 'Outbound' && !!t.sentToServer && !!t.failure
}
export function mkFailed(t: Omit<FailedMessage, 'classification'>): FailedMessage {
    const toReturn = {...t, classification: 'Failed' as 'Failed'}
    if(failed(toReturn)) return toReturn
    throw new Error(`Invalid failed message ${t}`)
}


export type Message = FailedMessage | SentMessage | AttendingMessage | InboundMessage

export type ObservableOnce<T> = Observable<T>