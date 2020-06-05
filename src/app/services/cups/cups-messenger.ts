import { Injectable } from '@angular/core'
import { config, CupsMessengerType } from '../../config'
import { HttpClient } from '@angular/common/http'
import { ContactWithMessageMeta, Contact, ServerMessage, ObservableOnce } from './types'
import { StandardMockCupsMessenger } from 'spec/mocks/mock-messenger'
import { LiveCupsMessenger, ShowMessagesOptions } from './live-messenger'
import { Auth } from '../state/auth-state'
import { map, concatMap } from 'rxjs/operators'
import { ErrorMockCupsMessenger } from 'spec/mocks/error-mock-messenger'
import { NoMessagesMockCupsMessenger } from 'spec/mocks/empty-messages-mock-messenger'
import { AuthMockCupsMessenger } from 'spec/mocks/auth-mock-messenger'
import { FastMockMessenger } from 'spec/mocks/fast-mock-messenger'
import { ParentNotReadyMessenger } from './parent-not-ready-messenger'
import { Observable, from, of } from 'rxjs'
import { getContext } from 'ambassador-sdk'

@Injectable({providedIn: 'root'})
export class CupsMessenger {
    private readonly impl: CupsMessengerI
    private readonly parentNotReadyImpl: CupsMessengerI

    constructor(http: HttpClient) {
        switch(config.cupsMessenger.type){
            case CupsMessengerType.LIVE:          
                this.impl = new LiveCupsMessenger(http)
                this.parentNotReadyImpl = new ParentNotReadyMessenger()
                break
            case CupsMessengerType.STANDARD_MOCK:    this.impl = new StandardMockCupsMessenger()   ; break
            case CupsMessengerType.ERROR_MOCK:       this.impl = new ErrorMockCupsMessenger()      ; break
            case CupsMessengerType.NO_MESSAGES_MOCK: this.impl = new NoMessagesMockCupsMessenger() ; break
            case CupsMessengerType.AUTH_MOCK:        this.impl = new AuthMockCupsMessenger()       ; break
            case CupsMessengerType.FAST_MOCK:        this.impl = new FastMockMessenger()           ; break
        }
    }

    contactsShow(loginTestPassword?: string): ObservableOnce<ContactWithMessageMeta[]> {
        return this.getImpl().pipe(concatMap(impl => impl.contactsShow(loginTestPassword || Auth.password)))
    }

    contactsAdd(contact: Contact): ObservableOnce<Contact> {
        return this.getImpl().pipe(concatMap(impl => impl.contactsAdd(contact).pipe(map(() => contact))))
    }

    contactsDelete(contact: Contact): ObservableOnce<void> {
        return this.getImpl().pipe(concatMap(impl => impl.contactsDelete(contact)))
    }

    messagesShow(contact: Contact, options: ShowMessagesOptions): ObservableOnce<ServerMessage[]> {
        return this.getImpl().pipe(concatMap(impl => impl.messagesShow(contact, options)))
    }

    messagesSend(contact: Contact, trackingId: string, message: string): ObservableOnce<{}> {
        return this.getImpl().pipe(concatMap(impl => impl.messagesSend(contact, trackingId, message)))
    }

    private getImpl(): Observable<CupsMessengerI>{
        if(!this.parentNotReadyImpl) return of(this.impl)
        return from(getContext().parentReady()).pipe(map(ready =>
            ready ? this.impl : this.parentNotReadyImpl
        ))
        
    }
}

interface CupsMessengerI {
    contactsShow(loginTestPassword?: string): ObservableOnce<ContactWithMessageMeta[]>
    contactsAdd(contact: Contact): ObservableOnce<void>
    contactsDelete(contact: Contact): ObservableOnce<void>
    messagesShow(contact: Contact, options: ShowMessagesOptions): ObservableOnce<ServerMessage[]>
    messagesSend(contact: Contact, trackingId: string, message: string): ObservableOnce<{}>
}