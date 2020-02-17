import { Injectable, ErrorHandler, Output, ViewChild, ElementRef, EventEmitter } from '@angular/core'
import { config } from '../../config'
import * as uuidv4 from 'uuid/v4'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { ContactWithMessageCount, Contact, mockL, mockContact, mockMessage, pauseFor, ServerMessage, AttendingMessage } from './types'
import { CupsResParser, onionToPubkeyString } from './cups-res-parser'
import { GlobalState, globe } from '../global-state'

// @TODO get rid of .catch enforcing error handling everywhere
@Injectable({providedIn: 'root'})
export class CupsMessenger {
    private impl: LiveCupsMessenger | MockCupsMessenger
    constructor(http: HttpClient) {
        if (config.cupsMessenger.mock) {
            this.impl = new MockCupsMessenger()
        } else {
            this.impl = new LiveCupsMessenger(http)
        }
    }


    contactsShow(): HandleError<ContactWithMessageCount[]> {
        return HandleError.of(this.impl.contactsShow())
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

export class HandleError<A> {
    static of<A0>(p: Promise<A0>): HandleError<A0> {
        return new HandleError(p)
    }
    constructor(private readonly p: Promise<A>) {}
    handle(errorHandler: (e: Error) => any): Promise<A> {
        return this.p.catch(errorHandler)
    }
}

export class LiveCupsMessenger {
    private readonly parser: CupsResParser = new CupsResParser()
    constructor(private readonly http: HttpClient) {}

    private get authHeaders(): HttpHeaders {
        if (!globe.password) { throw new Error('Unauthenticated request to server attempted.') }
        return new HttpHeaders({Authorization: 'Basic ' + btoa(`me:${globe.password}`)})
    }

    private get hostUrl(): string {
        if (!globe.password) { throw new Error('Unauthenticated request to server attempted.') }
        return config.cupsMessenger.url
    }

    async contactsShow(): Promise<ContactWithMessageCount[]> {
        try {
            const arrayBuffer = await this.http.get(
                this.hostUrl,
                {
                    params: {
                        type: 'users'
                    },
                    headers: this.authHeaders,
                    responseType: 'arraybuffer'
                }
            ).toPromise()
            return this.parser.deserializeContactsShow(arrayBuffer)
        } catch (e) {
            console.error('Contacts show', e)
            console.error('Contacts show', JSON.stringify(e))
            throw e
        }
    }

    async contactsAdd(contact: Contact): Promise<void> {
        const toPost = this.parser.serializeContactsAdd(contact.torAddress, contact.name)
        return this.http.post<void>(
            this.hostUrl, new Blob([toPost]), {  headers: this.authHeaders }
        ).toPromise().then(p => globe.pokeNewContact(contact))
    }

    async messagesShow(contact: Contact, limit: number = 15): Promise<ServerMessage[]> {
        try {
            const arrayBuffer = await this.http.get(
                    this.hostUrl,
                    {
                        params: {
                            type: 'messages',
                            pubkey: onionToPubkeyString(contact.torAddress),
                            limit: String(limit)
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
        } catch (e) {
            console.error('Messages show', e)
            console.error('Messages show', JSON.stringify(e))
            throw e
        }
    }

    async messagesSend(contact: Contact, message: string): Promise<void> {
        const toPost = this.parser.serializeSendMessage(contact.torAddress, message)
        return this.http.post<void>(
            this.hostUrl, new Blob([toPost]), {  headers: this.authHeaders }
        ).toPromise()
    }
}

const mocks = {} // mockL(mockMessage, 2)

export class MockCupsMessenger {
    contacts = mockL(mockContact, 5)
    counter = 0

    constructor() {}

    async contactsShow(): Promise<ContactWithMessageCount[]> {
        throw new Error('fuck you')
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
            if (this.counter % 10 === 0) {
                await pauseFor(2000)
            }

            this.getMessageMocks(contact).push(mockMessage(this.counter))
        }
        return Promise.resolve(JSON.parse(JSON.stringify(this.getMessageMocks(contact))))
    }

    async messagesSend(contact: Contact, message: string): Promise<void> {
        globe.logState('first', contact)
        await pauseFor(2000)
        this.getMessageMocks(contact).push({
            timestamp: new Date(),
            direction: 'Outbound',
            otherParty: contact,
            text: message,
            id: uuidv4(),
            attending: false
        })
        globe.logState('second', contact)
    }

    private getMessageMocks(c: Contact) {
        mocks[c.torAddress] = (mocks[c.torAddress] || mockL(mockMessage, 2))
        return mocks[c.torAddress]
    }
}


@Output('onSearch') 
const onSearch = new EventEmitter<string>();
@ViewChild('searchInput', { static: false }) 
input: ElementRef;
