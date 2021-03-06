import { ContactWithMessageMeta, Contact, ServerMessage, ObservableOnce, mkSent } from 'src/app/services/cups/types'
import * as uuid from 'uuid'
import { timer, interval } from 'rxjs'
import { map, take } from 'rxjs/operators'
import { fillDefaultOptions, ShowMessagesOptions } from 'src/app/services/cups/live-messenger'
import { Log } from 'src/app/log'
import { mockL, mockContact, mockMessage } from './util'
import { sortByTimestampDESC } from 'src/app/util'

export class StandardMockCupsMessenger {
    readonly serverTimeToLoad: number = 2000
    contacts = mockL(mockContact, 10)
    mocks: {[tor: string]: ServerMessage[]} = {}
    counter = 0

    constructor() {
        this.contacts.forEach( (c, index) => {
            if(index === 0){
                this.mocks[c.torAddress] = mockL(mockMessage, 0)
                c.unreadMessages = 0
            } else if (index === 1) {
                const message = mockMessage(1)
                this.mocks[c.torAddress] = [message]
                c.unreadMessages = 1
                this.contacts.find(cont => cont.torAddress === c.torAddress).lastMessages[0] = message
            } else if (index === 2) {
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                yesterday.setSeconds(yesterday.getSeconds() + 1)

                const earlierInWeek = new Date()
                earlierInWeek.setDate(earlierInWeek.getDate() - 3)
                
                const message1 = mockMessage(1, yesterday)
                const message2 = mockMessage(1, earlierInWeek)
                this.mocks[c.torAddress] = [message1, message2]
                c.unreadMessages = 1
                this.contacts.find(cont => cont.torAddress === c.torAddress).lastMessages[0] = message1
            } else {
                const ms = mockL(mockMessage, 60).sort(sortByTimestampDESC) //most recent message is first
                this.mocks[c.torAddress] = ms
                c.unreadMessages = 60
                this.contacts.find(cont => cont.torAddress === c.torAddress).lastMessages[0] = ms[0]
            }
        })
        this.kickoffMessages()
    }

    kickoffMessages(){
        interval(10000).subscribe(i => {
            this.contacts.forEach( (c, index) => {
                if(index === 3) return 
                const m = mockMessage(i, new Date())
                this.mocks[c.torAddress].unshift(m)
                this.contacts.find(cont => cont.torAddress === c.torAddress).lastMessages[0] = m
                c.unreadMessages += 1
            })
        })
    }

    contactsShow (testPassword?: string): ObservableOnce<ContactWithMessageMeta[]> {
        Log.trace('showing this.contacts', this.contacts)

        return timer(this.serverTimeToLoad).pipe(map(() => this.contacts.map(clone)), take(1))
    }

    contactsAdd (contact: Contact): ObservableOnce<void> {
        return timer(this.serverTimeToLoad).pipe(map(() => {
            const nonMatchingTors = this.contacts.filter(c => c.torAddress !== contact.torAddress)
            this.mocks[contact.torAddress] = []
            this.contacts = nonMatchingTors.concat(Object.assign({ unreadMessages: 0, lastMessages: [] }, contact))
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

    messagesShow (contact: ContactWithMessageMeta, options: ShowMessagesOptions): ObservableOnce<ServerMessage[]> {
        const { limit, offset } = fillDefaultOptions(options)
        const messages = this.getMessageMocks(contact)
        let toReturn: ServerMessage[]
        if(offset){
            const i = messages.findIndex(m => m.id && m.id === offset.id)
            switch(offset.direction){
                // most recent message is first
                case 'before'  : toReturn = messages.slice(i + 1, i + limit + 1); break
                case 'after' : toReturn = messages.slice(i - limit, i); break
            }
        } else {
            toReturn = messages.slice(0, limit)
        }
        this.contacts.forEach((c, i) => {
            if(c.torAddress === contact.torAddress){
                this.contacts.splice(i, 1, {...contact, unreadMessages: 0})
            }
        })
        return timer(this.serverTimeToLoad).pipe(map(() => toReturn), take(1))
    }

    messagesSend (contact: Contact, trackingId: string, message: string): ObservableOnce<{}> {
        return timer(this.serverTimeToLoad).pipe(
            map(() => {
                this.mocks[contact.torAddress].unshift(
                    mkSent({
                        timestamp: new Date(),
                        direction: 'Outbound' as 'Outbound',
                        otherParty: contact,
                        text: message,
                        id: uuid.v4(),
                        trackingId,
                    })
                )
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