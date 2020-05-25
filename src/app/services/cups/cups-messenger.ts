import { Injectable } from '@angular/core'
import { config, CupsMessengerType } from '../../config'
import { HttpClient } from '@angular/common/http'
import { ContactWithMessageMeta, Contact, ServerMessage, ObservableOnce } from './types'
import { StandardMockCupsMessenger } from 'spec/mocks/mock-messenger'
import { LiveCupsMessenger, ShowMessagesOptions } from './live-messenger'
import { Auth } from '../state/auth-state'
import { Log } from 'src/app/log'
import { map } from 'rxjs/operators'
import { ErrorMockCupsMessenger } from 'spec/mocks/error-mock-messenger'
import { NoMessagesMockCupsMessenger } from 'spec/mocks/empty-messages-mock-messenger'
import { AuthMockCupsMessenger } from 'spec/mocks/auth-mock-messenger'
import { FastMockMessenger } from 'spec/mocks/fast-mock-messenger'

@Injectable({providedIn: 'root'})
export class CupsMessenger {
    private readonly impl
    constructor(http: HttpClient) {
        switch(config.cupsMessenger.type){
            case CupsMessengerType.LIVE:             this.impl = new LiveCupsMessenger(http)       ; break
            case CupsMessengerType.STANDARD_MOCK:    this.impl = new StandardMockCupsMessenger()   ; break
            case CupsMessengerType.ERROR_MOCK:       this.impl = new ErrorMockCupsMessenger()      ; break
            case CupsMessengerType.NO_MESSAGES_MOCK: this.impl = new NoMessagesMockCupsMessenger() ; break
            case CupsMessengerType.AUTH_MOCK:        this.impl = new AuthMockCupsMessenger()       ; break
            case CupsMessengerType.FAST_MOCK:        this.impl = new FastMockMessenger()           ; break
        }
    }

    contactsShow(loginTestPassword?: string): ObservableOnce<ContactWithMessageMeta[]> {
        Log.trace(`higher-order cups messenger contacts show...`)
        return this.impl.contactsShow(loginTestPassword || Auth.password)
    }

    contactsAdd(contact: Contact): ObservableOnce<Contact> {
        return this.impl.contactsAdd(contact).pipe(map(() => contact))
    }

    contactsDelete(contact: Contact): ObservableOnce<void> {
        return this.impl.contactsDelete(contact)
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