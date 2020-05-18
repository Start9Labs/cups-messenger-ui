import { Injectable } from '@angular/core'
import { config, MockType } from '../../config'
import { HttpClient } from '@angular/common/http'
import { ContactWithMessageCount, Contact, ServerMessage, ObservableOnce } from './types'
import { MockCupsMessenger } from 'spec/mocks/mock-messenger'
import { LiveCupsMessenger, ShowMessagesOptions } from './live-messenger'
import { Auth } from '../state/auth-state'
import { Log } from 'src/app/log'
import { map } from 'rxjs/operators'

@Injectable({providedIn: 'root'})
export class CupsMessenger {
    private readonly impl
    constructor(http: HttpClient) {
        switch(config.cupsMessenger.mock){
            case MockType.LIVE: this.impl = new LiveCupsMessenger(http); break
            case MockType.STANDARD_MOCK: this.impl = new MockCupsMessenger(); break
            // case MockType.STANDARD_MOCK: this.impl = new MockCupsMessenger(); break
        }

        this.impl = config.cupsMessenger.mock ? new MockCupsMessenger() : new LiveCupsMessenger(http)
    }

    contactsShow(loginTestPassword?: string): ObservableOnce<ContactWithMessageCount[]> {
        Log.trace(`higher-order cups messenger contacts show...`)
        return this.impl.contactsShow(loginTestPassword || Auth.password)
    }

    contactsAdd(contact: Contact): ObservableOnce<Contact> {
        return this.impl.contactsAdd(contact).pipe(map(() => contact))
    }

    messagesShow(contact: Contact, options: ShowMessagesOptions): ObservableOnce<ServerMessage[]> {
        return this.impl.messagesShow(contact, options)
    }

    messagesSend(contact: Contact, trackingId: string, message: string): ObservableOnce<{}> {
        return this.impl.messagesSend(contact, trackingId, message)
    }

    newMessagesShow(contact: Contact): ObservableOnce<ServerMessage[]> {
        return this.impl.newMessagesShow(contact)
    }
}