import { Injectable, ErrorHandler } from '@angular/core'
import { config } from '../../config'
import * as uuidv4 from 'uuid/v4'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { ContactWithMessageCount, Contact, mockL, mockContact, mockMessage, pauseFor, ServerMessage, AttendingMessage } from './types'
import { CupsResParser, onionToPubkeyString } from './cups-res-parser'
import { GlobalState } from '../global-state'

//@TODO get rid of .catch enforcing error handling everywhere
@Injectable({providedIn: 'root'})
export class CupsMessenger {
    private impl: LiveCupsMessenger | MockCupsMessenger
    constructor(globe: GlobalState, http: HttpClient) {
        if (config.cupsMessenger.mock) {
            this.impl = new MockCupsMessenger(globe)
        } else {
            this.impl = new LiveCupsMessenger(globe, http)
        }
    }

    async contactsShow(): Promise<ContactWithMessageCount[]> {
        return HandleError.of(this.impl.contactsShow()).handle(console.error)
    }
    contactsAdd(contact: Contact): HandleError<void> {
        return HandleError.of(this.impl.contactsAdd(contact))
    }
    async messagesShow(contact: Contact, limit: number = 15): Promise<ServerMessage[]> {
        return HandleError.of(this.impl.messagesShow(contact, limit)).handle(console.error)
    }
    async messagesSend(contact: Contact, message: string): Promise<void> {
        return HandleError.of(this.impl.messagesSend(contact, message)).handle(console.error)
    }
}

export class HandleError<A>{
    static of<A0>(p : Promise<A0>): HandleError<A0> {
        return new HandleError(p)
    }
    constructor (private readonly p : Promise<A>) {}
    handle(errorHandler: (e: Error) => any): Promise<A> {
        return this.p.catch(errorHandler)
    }
}

export class LiveCupsMessenger {
    private readonly parser : CupsResParser = new CupsResParser()
    constructor(private readonly globe: GlobalState,private readonly http: HttpClient){}

    private get authHeaders(): HttpHeaders {
        if(!this.globe.password) throw new Error('Unauthenticated request to server attempted.')
        return new HttpHeaders({"Authorization": "Basic " + btoa(`me:${this.globe.password}`)});
    }

    private get hostUrl(): string {
        if(!this.globe.password) throw new Error('Unauthenticated request to server attempted.')
        return `http://` + config.cupsMessenger.url + "/"
    }

    async contactsShow(): Promise<ContactWithMessageCount[]> {
        try {
            const arrayBuffer = await this.http.get(
                this.hostUrl, { params: { type: 'users' }, headers: this.authHeaders, responseType: 'arraybuffer' }
            ).toPromise()
            return this.parser.deserializeContactsShow(arrayBuffer)
        } catch (e) {
            console.error(e)
            throw e
        }
    }

    async contactsAdd(contact: Contact): Promise<void> {
        const toPost = this.parser.serializeContactsAdd(contact.torAddress, contact.name)
        return this.http.post<void>(
            this.hostUrl, new Blob([toPost]), {  headers: this.authHeaders }
        ).toPromise().then(p => this.globe.pokeNewContact(contact))
    }

    async messagesShow(contact: Contact, limit: number = 15): Promise<ServerMessage[]> {
        const arrayBuffer = await this.http.get(
            this.hostUrl, { params: { 
                type: 'messages', 
                pubkey: onionToPubkeyString(contact.torAddress)
                },
                headers: this.authHeaders,
                responseType: 'arraybuffer'
            }
        ).toPromise()

        return this.parser.deserializeMessagesShow(arrayBuffer).map(m => 
            ({...m, 
                attending: false,
                id: uuidv4(),
                otherParty: contact
            })
        )
    }

    async messagesSend(contact: Contact, message: string): Promise<void> {
        const toPost = this.parser.serializeSendMessage(contact.torAddress, message)
        return this.http.post<void>(
            this.hostUrl, new Blob([toPost]), {  headers: this.authHeaders }
        ).toPromise()
    }
}

const mocks = {} //mockL(mockMessage, 2)

export class MockCupsMessenger {
    contacts = mockL(mockContact, 5)
    counter = 0

    constructor(private globe: GlobalState){}

    async contactsShow(): Promise<ContactWithMessageCount[]> {
        if (this.counter % 5 === 0) {
            this.contacts[1].unreadMessages ++
        }
        return this.contacts
    }

    async contactsAdd(contact: Contact): Promise<void> {
        await pauseFor(2000)
        const nonMatchingTors = this.contacts.filter(c => c.torAddress !== contact.torAddress)
        this.contacts = []
        this.contacts.push(...nonMatchingTors)
        this.contacts.push(Object.assign({unreadMessages: 0}, contact))
    }

    async messagesShow(contact: Contact, limit: number = 15): Promise<ServerMessage[]> {
        this.counter++
        if (this.counter % 5 === 0) {
            if(this.counter % 10 === 0) {
                await pauseFor(2000)
            }

           this.getMessageMocks(contact).push(mockMessage(this.counter))
        }
        return Promise.resolve(JSON.parse(JSON.stringify(this.getMessageMocks(contact))))
    }
    
    async messagesSend(contact: Contact, message: string): Promise<void> {
        this.globe.logState("first", contact)
        await pauseFor(2000)
        this.getMessageMocks(contact).push({
            timestamp: new Date(),
            direction: 'Outbound',
            otherParty: contact,
            text: message,
            id: uuidv4(),
            attending: false
        })
        this.globe.logState("second", contact)
    }

    private getMessageMocks(c: Contact){
        mocks[c.torAddress] = (mocks[c.torAddress] || mockL(mockMessage, 2))
        return mocks[c.torAddress]
    }
}