import { Contact,
        ContactWithMessageCount,
        ServerMessage,
        AttendingMessage,
        serverMessageFulfills,
        MessageBase,
        attendingMessageFulfills,
        FailedMessage
       } from './cups/types'
import { BehaviorSubject, NextObserver, combineLatest, Observable, Subject, PartialObserver } from 'rxjs'
import { Plugins } from '@capacitor/core'
import { take, map } from 'rxjs/operators'
const { Storage } = Plugins

const passwordKey = { key: 'password' }

export interface CategorizedMessages { server: ServerMessage[], attending: AttendingMessage[] }
export type CategorizedMessagesSubject = [ BehaviorSubject<AttendingMessage[]>, BehaviorSubject<ServerMessage[]> ]

export class Globe {
    $contacts$: BehaviorSubject<ContactWithMessageCount[]> = new BehaviorSubject([])
    contactsPid$: BehaviorSubject<string> = new BehaviorSubject('')
    currentContact$: BehaviorSubject<Contact | undefined> = new BehaviorSubject(undefined)
    password: string | undefined = undefined
    contactMessages: {
        [contactTorAddress: string]: CategorizedMessagesSubject
    } = {}

    constructor() {}

    private latestOutboundServerMessageTime: Date = new Date(0)
    private latestOverallServerMessageTime: Date = new Date(0)

    observeContacts: PartialObserver<ContactWithMessageCount[]> = {
        next: contacts => {
            console.log(`nexting contacts`)
            if(contacts) {
                this.$contacts$.next(contacts)
            }
        },
    }

    $observeServerMessages: NextObserver<{ contact: Contact, messages: ServerMessage[] }> = {
        next : ({contact, messages}) => {
            combineLatest(this.contactMessagesSubjects(contact.torAddress)).pipe(take(1)).subscribe( ([attendingMs, serverMs]) => {
                if(!messages || !messages.length) { return }

                const newMessages = messages
                    .filter(m => m.timestamp.getTime() > this.latestOverallServerMessageTime.getTime())
                    .sort(sortByTimestamp)

                if(newMessages && newMessages.length){
                    this.latestOverallServerMessageTime = newMessages[0].timestamp
                }

                const newOutboundMessages = newMessages
                    .filter(m => m.direction === 'Outbound')
                    .filter(m => m.timestamp.getTime() > this.latestOutboundServerMessageTime.getTime())

                if(newOutboundMessages && newOutboundMessages.length){
                    this.latestOutboundServerMessageTime = newOutboundMessages[0].timestamp
                    newOutboundMessages.forEach(newOutbound => {
                        const i = attendingMs.findIndex(attending => serverMessageFulfills(newOutbound, attending))
                        attendingMs.splice(i, 1)
                    })
                }
                const newMessageState = newMessages.concat(serverMs)

                this.pokeServerMessages(contact, newMessageState)
                this.pokeAttendingMessages(contact, attendingMs)
            })
        }
    }

    observeAttendingMessage: NextObserver<{contact: Contact, attendingMessage: AttendingMessage}> =
        {
            next : ({contact, attendingMessage}) => {
                this.contactMessagesSubjects(contact.torAddress)[0].pipe(take(1)).subscribe(attendingMessages => {
                    this.pokeAttendingMessages(contact, [...attendingMessages, attendingMessage])
                })
            }
        }

    observeFailedMessage: NextObserver<{contact: Contact, failedMessage: FailedMessage}> =
        {
            next : ({contact, failedMessage}) => {
                this.contactMessagesSubjects(contact.torAddress)[0].pipe(take(1)).subscribe(attendingMessages => {
                    const i = attendingMessages.findIndex( m => {
                        attendingMessageFulfills(failedMessage, m)
                    } )
                    attendingMessages.splice(i, 1, failedMessage)
                    this.pokeAttendingMessages(contact, attendingMessages)
                })
            }
        }

    watchMessages(c: Contact): Observable<MessageBase[]> {
        return combineLatest(this.contactMessagesSubjects(c.torAddress)).pipe(map(
            ([attending, server]) => (attending as MessageBase[]).concat(server)
        ))
    }

    async init(): Promise<void> {
        return Storage.get(passwordKey).then(p => { this.password = p.value })
    }

    async setPassword(p: string): Promise<void> {
        return Storage.set({
            key: 'password',
            value: p
        }).then(() => this.init())
    }

    async clearPassword(): Promise<void> {
        Storage.remove(passwordKey)
        this.password = undefined
        return
    }

    private contactMessagesSubjects(tor: string): CategorizedMessagesSubject {
        if(!this.contactMessages[tor]) { this.contactMessages[tor] = [new BehaviorSubject([]), new BehaviorSubject([])] }
        return this.contactMessages[tor]
    }
    private pokeAttendingMessages( c: Contact, as : AttendingMessage[] ): void {
        this.contactMessagesSubjects(c.torAddress)[0].next(as.sort(sortByTimestamp))
    }
    private pokeServerMessages( c: Contact, ss : ServerMessage[] ): void {
        this.contactMessagesSubjects(c.torAddress)[1].next(ss.sort(sortByTimestamp))
    }
}



export const globe = new Globe()


const sortByTimestamp =
    (a: MessageBase, b: MessageBase) => b.timestamp.getTime() - a.timestamp.getTime()