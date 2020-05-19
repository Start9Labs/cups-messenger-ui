import { ContactWithMessageCount, Contact, ServerMessage, ObservableOnce, mkSent } from 'src/app/services/cups/types'
import * as uuid from 'uuid'
import { of, timer, interval } from 'rxjs'
import { map, concatMap } from 'rxjs/operators'
import { fillDefaultOptions, ShowMessagesOptions } from 'src/app/services/cups/live-messenger'
import { Log } from 'src/app/log'
import { mockL, mockContact, mockMessage } from './util'


export class StandardMockCupsMessenger {
    contacts = mockL(mockContact, 5)
    mocks: {[tor: string]: ServerMessage[]} = {}
    counter = 0
    constructor() {
        this.contacts.forEach( c => {
            this.mocks[c.torAddress] = mockL(mockMessage, 30)
        })
        interval(5000).subscribe(i => {
            this.contacts.forEach( c => {
                this.mocks[c.torAddress].push(mockMessage(i, new Date()))
            })
        })
    }

    contactsShow (): ObservableOnce<ContactWithMessageCount[]> {
        Log.trace('showing this.contacts', this.contacts)
        return timer(1000).pipe(map(() => this.contacts))
    }

    contactsAdd (contact: Contact): ObservableOnce<void> {
        return timer(2000).pipe(map(() => {
            const nonMatchingTors = this.contacts.filter(c => c.torAddress !== contact.torAddress)
            this.mocks[contact.torAddress] = []
            this.contacts = nonMatchingTors.concat(Object.assign({ unreadMessages: 0 }, contact))
        }))
    }

    messagesShow (contact: Contact, options: ShowMessagesOptions): ObservableOnce<ServerMessage[]> {
        const { limit, offset } = fillDefaultOptions(options)
        const messages = this.getMessageMocks(contact)
        let toReturn: ObservableOnce<ServerMessage[]>
        if(offset){
            const i = messages.findIndex(m => m.id && m.id === offset.id)
            switch(offset.direction){
                case 'after'  : toReturn = of(messages.slice(i + 1, i + 1 + limit)); break
                case 'before' : toReturn = of(messages.slice(i - limit, i)); break
            }
        } else {
            toReturn = of(messages.slice(messages.length - limit + 1, messages.length))
        }
        return timer(1000).pipe(concatMap(() => toReturn))
    }

    newMessagesShow(): ObservableOnce<ServerMessage[]> {
        return of([])
    }

    messagesSend (contact: Contact, trackingId: string, message: string): ObservableOnce<{}> {
        return timer(2000).pipe(
            map(
                () => {
                    const m = mkSent({
                        timestamp: new Date(),
                        direction: 'Outbound' as 'Outbound',
                        otherParty: contact,
                        text: message,
                        id: uuid.v4(),
                        trackingId,
                    })
                    this.mocks[contact.torAddress].push(m)
                    return {}
                })
            )
    }
    private getMessageMocks (c: Contact): ServerMessage[] {
        return JSON.parse(
            JSON.stringify(
                this.mocks[c.torAddress]
            )
        ).map(x => { x.timestamp = new Date(x.timestamp); return x })
    }
}