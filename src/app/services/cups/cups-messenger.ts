import { Injectable } from '@angular/core'
import { config } from '../../config'
import { HttpClient } from '@angular/common/http'
import { ContactWithMessageCount, Contact, ServerMessage, ObservableOnce } from './types'
import { MockCupsMessenger } from 'spec/mocks/mock-messenger'
import { LiveCupsMessenger, ShowMessagesOptions } from './live-messenger'
import { Auth } from '../state/auth-state'

@Injectable({providedIn: 'root'})
export class CupsMessenger {
    private readonly impl
    constructor(http: HttpClient) {
        this.impl = config.cupsMessenger.mock ? new MockCupsMessenger() : new LiveCupsMessenger(http)
    }

    contactsShow(loginTestPassword?: string): ObservableOnce<ContactWithMessageCount[]> {
        return this.impl.contactsShow(loginTestPassword || Auth.password)
    }

    contactsAdd(contact: Contact): ObservableOnce<void> {
        return this.impl.contactsAdd(contact)
    }

    messagesShow(contact: Contact, options: ShowMessagesOptions): ObservableOnce<ServerMessage[]> {
        return this.impl.messagesShow(contact, options)
    }

    messagesSend(contact: Contact, trackingId: string, message: string): ObservableOnce<void> {
        return this.impl.messagesSend(contact, trackingId, message)
    }

    newMessagesShow(contact: Contact): ObservableOnce<ServerMessage[]> {
        return this.impl.newMessagesShow(contact)
    }
}