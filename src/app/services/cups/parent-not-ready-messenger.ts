import { Injectable } from '@angular/core'
import { ContactWithMessageMeta, Contact, ServerMessage, ObservableOnce } from './types'
import { ShowMessagesOptions } from './live-messenger'

@Injectable({providedIn: 'root'})
export class ParentNotReadyMessenger {
    constructor() {
    }

    contactsShow(): ObservableOnce<ContactWithMessageMeta[]> {
        throw new Error(`Parent not ready, cannot execute contactsShow`) 
    }

    contactsAdd(): ObservableOnce<void> {
        throw new Error(`Parent not ready, cannot execute contactsAdd`) 
    }

    contactsDelete(): ObservableOnce<void> {
        throw new Error(`Parent not ready, cannot execute contactsDelete`) 
    }

    messagesShow(): ObservableOnce<ServerMessage[]> {
        throw new Error(`Parent not ready, cannot execute messagesShow`) 
    }

    messagesSend(): ObservableOnce<{}> {
        throw new Error(`Parent not ready, cannot execute messagesSend`) 
    }
}