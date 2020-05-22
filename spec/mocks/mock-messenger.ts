import { ContactWithMessageCount, Contact, ServerMessage, ObservableOnce, mkSent } from 'src/app/services/cups/types'
import * as uuid from 'uuid'
import { of, timer, interval } from 'rxjs'
import { map, take } from 'rxjs/operators'
import { fillDefaultOptions, ShowMessagesOptions } from 'src/app/services/cups/live-messenger'
import { Log } from 'src/app/log'
import { mockL, mockContact, mockMessage } from './util'


export class StandardMockCupsMessenger {
    readonly serverTimeToLoad: number = 2000
    contacts = mockL(mockContact, 5)
    mocks: {[tor: string]: ServerMessage[]} = {}
    counter = 0
    constructor() {
        this.contacts.forEach( (c, index) => {
            if(index === 0){
                this.mocks[c.torAddress] = mockL(mockMessage, 0)
                c.unreadMessages = 0
            } else {
                this.mocks[c.torAddress] = mockL(mockMessage, 30)
                c.unreadMessages = 30
            }
        })
        interval(10000).subscribe(i => {
            this.contacts.forEach( c => {
                this.mocks[c.torAddress].push(mockMessage(i, new Date()))
            })
            this.contacts.forEach(c => {
                c.unreadMessages += 1
            })
        })
    }

    contactsShow (testPassword?: string): ObservableOnce<ContactWithMessageCount[]> {
        Log.trace('showing this.contacts', this.contacts)
        return timer(this.serverTimeToLoad).pipe(map(() => this.contacts.map(clone)), take(1))
    }

    contactsAdd (contact: Contact): ObservableOnce<void> {
        return timer(this.serverTimeToLoad).pipe(map(() => {
            const nonMatchingTors = this.contacts.filter(c => c.torAddress !== contact.torAddress)
            this.mocks[contact.torAddress] = []
            this.contacts = nonMatchingTors.concat(Object.assign({ unreadMessages: 0 }, contact))
        }), take(1))
    }

    contactsDelete(contact: Contact): ObservableOnce<void> {
        return timer(this.serverTimeToLoad).pipe(
            take(1),
            map(() => {
                const index = this.contacts.findIndex(c => c.torAddress === contact.torAddress)
                if(index < 0) throw new Error('contact not found')
                this.contacts.splice(index, 1)
            })
        )
    }

    messagesShow (contact: ContactWithMessageCount, options: ShowMessagesOptions): ObservableOnce<ServerMessage[]> {
        const { limit, offset } = fillDefaultOptions(options)
        const messages = this.getMessageMocks(contact)
        let toReturn: ServerMessage[]
        if(offset){
            const i = messages.findIndex(m => m.id && m.id === offset.id)
            switch(offset.direction){
                case 'after'  : toReturn = messages.slice(i + 1, i + 1 + limit); break
                case 'before' : toReturn = messages.slice(i - limit, i); break
            }
        } else {
            toReturn = messages.slice(messages.length - limit + 1, messages.length)
        }
        const i = this.contacts.findIndex(c => c.torAddress === contact.torAddress)

        this.contacts.forEach(c => {
            if(c.torAddress === contact.torAddress && options.markAsRead){
                this.contacts.splice(i, 1, {...contact, unreadMessages: 0})
            }
        })

        return timer(this.serverTimeToLoad).pipe(map(() => toReturn), take(1))
    }

    newMessagesShow(): ObservableOnce<ServerMessage[]> {
        return of([])
    }

    messagesSend (contact: Contact, trackingId: string, message: string): ObservableOnce<{}> {
        return timer(this.serverTimeToLoad).pipe(
            map(() => {
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
            }),
            take(1)
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

function clone(a){
    return JSON.parse(JSON.stringify(a))
}