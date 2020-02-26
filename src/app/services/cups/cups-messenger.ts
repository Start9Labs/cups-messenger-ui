import { Injectable } from '@angular/core'
import { config } from '../../config'
import { HttpClient } from '@angular/common/http'
import { ContactWithMessageCount, Contact, ServerMessage } from './types'
import { globe } from '../global-state'
import { MockCupsMessenger } from 'spec/mocks/mock-messenger'
import { LiveCupsMessenger, ShowMessagesOptions } from './live-messenger'

@Injectable({providedIn: 'root'})
export class CupsMessenger {
    private readonly impl
    constructor(http: HttpClient) {
        this.impl = config.cupsMessenger.mock ? new MockCupsMessenger() : new LiveCupsMessenger(http)
    }

    contactsShow(loginTestPassword?: string): Promise<ContactWithMessageCount[]> {
        return this.impl.contactsShow(loginTestPassword || globe.password)
    }

    contactsAdd(contact: Contact): Promise<void> {
        return this.impl.contactsAdd(contact)
    }

    async messagesShow(contact: Contact, options: ShowMessagesOptions): Promise<ServerMessage[]> {
        return this.impl.messagesShow(contact, options)
    }

    async messagesSend(contact: Contact, trackingId: string, message: string): Promise<void> {
        return this.impl.messagesSend(contact, trackingId, message)
    }

    async newMessagesShow(contact: Contact): Promise<ServerMessage[]> {
        return this.impl.newMessagesShow(contact)
    }
}