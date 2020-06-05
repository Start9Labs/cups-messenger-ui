import { Injectable } from '@angular/core'
import { config, CupsMessengerType } from '../../config'
import { HttpClient } from '@angular/common/http'
import { ContactWithMessageMeta, Contact, ServerMessage, ObservableOnce } from './types'
import { StandardMockCupsMessenger } from 'spec/mocks/mock-messenger'
import { LiveCupsMessenger, ShowMessagesOptions } from './live-messenger'
import { AuthState } from '../state/auth-state'
import { map } from 'rxjs/operators'
import { ErrorMockCupsMessenger } from 'spec/mocks/error-mock-messenger'
import { NoMessagesMockCupsMessenger } from 'spec/mocks/empty-messages-mock-messenger'
import { AuthMockCupsMessenger } from 'spec/mocks/auth-mock-messenger'
import { FastMockMessenger } from 'spec/mocks/fast-mock-messenger'

@Injectable({providedIn: 'root'})
export class CupsMessenger {
    private readonly impl
    constructor(
      private readonly http: HttpClient,
      private readonly authState: AuthState,
    ) {
        switch(config.cupsMessenger.type){
            case CupsMessengerType.LIVE:             this.impl = new LiveCupsMessenger(this.http, this.authState)       ; break
            case CupsMessengerType.STANDARD_MOCK:    this.impl = new StandardMockCupsMessenger()   ; break
            case CupsMessengerType.ERROR_MOCK:       this.impl = new ErrorMockCupsMessenger()      ; break
            case CupsMessengerType.NO_MESSAGES_MOCK: this.impl = new NoMessagesMockCupsMessenger() ; break
            case CupsMessengerType.AUTH_MOCK:        this.impl = new AuthMockCupsMessenger()       ; break
            case CupsMessengerType.FAST_MOCK:        this.impl = new FastMockMessenger()           ; break
        }
    }

    contactsShow(loginTestPassword?: string): ObservableOnce<ContactWithMessageMeta[]> {
        return this.impl.contactsShow(loginTestPassword || this.authState.password)
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
}