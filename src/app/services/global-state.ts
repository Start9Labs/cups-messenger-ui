import { Contact,
        ContactWithMessageCount,
        AttendingMessage,
        MessageBase,
        FailedMessage,
       } from './cups/types'
import { BehaviorSubject, NextObserver, combineLatest, Observable, Subject, PartialObserver } from 'rxjs'
import { Plugins } from '@capacitor/core'
import { take, map, retry } from 'rxjs/operators'
import { BrowserTransferStateModule } from '@angular/platform-browser'
const { Storage } = Plugins

const passwordKey = { key: 'password' }

export class Globe {
    $contacts$: BehaviorSubject<ContactWithMessageCount[]> = new BehaviorSubject([])
    contactsPid$: BehaviorSubject<string> = new BehaviorSubject('')
    currentContact$: BehaviorSubject<Contact | undefined> = new BehaviorSubject(undefined)
    password: string | undefined = undefined
    contactMessages: {
        [contactTorAddress: string]: BehaviorSubject<MessageBase[]>
    } = {}

    constructor() {}

    private latestOverallServerMessageTime: Date = new Date(0)

    observeContacts: PartialObserver<ContactWithMessageCount[]> = {
        next: contacts => {
            console.log(`nexting contacts`)
            if(contacts) {
                this.$contacts$.next(contacts)
            }
        },
    }

    $observeServerMessages: NextObserver<{ contact: Contact, messages: MessageBase[] }> = {
        next : ({contact, messages}) => {
            this.contactMessagesSubjects(contact.torAddress).pipe(take(1)).subscribe( existingMessages => {
                const {yes : finalized, no : attending} = partition(messages.concat(existingMessages), isFinalized)
                uniqueBy(finalized, m => (m.result as any).id)

                const finalizedMs = existingMessages.map(m => (m.result as any).id).filter(m => m)

                newMessages = newMessages.filter(m => {
                    if(m.result.id){
                        m.result.id
                    }
                })
            })
            // combineLatest(this.contactMessagesSubjects(contact.torAddress)).pipe(take(1)).subscribe( ms => {
            //     if(!messages || !messages.length) { return }

            //     const newMessages = messages
            //         .filter(m => m.timestamp.getTime() > this.latestOverallServerMessageTime.getTime())
            //         .sort(sortByTimestamp)

            //     if(newMessages && newMessages.length){
            //         this.latestOverallServerMessageTime = newMessages[0].timestamp
            //     }

            //     const newMessageState = newMessages.concat(ms)

            //     this.contactMessagesSubjects(contact.torAddress).next(newMessages.sort(sortByTimestamp))
            // })
        }
    }


    observeFailedMessage: NextObserver<{contact: Contact, failedMessage: FailedMessage}> =
        {
            next : ({contact, failedMessage}) => {
                this.contactMessagesSubjects(contact.torAddress)[0].pipe(take(1)).subscribe(attendingMessages => {
                    const i = attendingMessages.findIndex( m => attendingMessageFulfills(failedMessage, m))
                    if(i >= 0) {
                        attendingMessages.splice(i, 1, failedMessage)
                        this.pokeAttendingMessages(contact, attendingMessages)
                    }
                })
            }
        }

    observeDeleteMessage: NextObserver<{contact: Contact, failedMessage: FailedMessage}> =
        {
            next : ({contact, failedMessage}) => {
                this.contactMessagesSubjects(contact.torAddress)[0].pipe(take(1)).subscribe(attendingMessages => {
                    const i = attendingMessages.findIndex( m => attendingMessageFulfills(failedMessage, m))
                    if(i >= 0) {
                        attendingMessages.splice(i, 1)
                        this.pokeAttendingMessages(contact, attendingMessages)
                    }
                })
            }
        }

    watchMessages(c: Contact): Observable<MessageBase[]> {
        return this.contactMessagesSubjects(c.torAddress)
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

    private contactMessagesSubjects(tor: string): BehaviorSubject<MessageBase[]> {
        if(!this.contactMessages[tor]) { this.contactMessages[tor] = new BehaviorSubject([]) }
        return this.contactMessages[tor]
    }
}



export const globe = new Globe()


const sortByTimestamp =
    (a: MessageBase, b: MessageBase) => b.timestamp.getTime() - a.timestamp.getTime()

function uniqueBy<T>(ts : T[], projection: (t: T) => string): T[] {
    const tracking = { } as { [projected: string] : T }
    ts.forEach( t => tracking[projection(t)] = t )
    return Object.values(tracking)
}

function categorize<T>(ts: T[], predicates: ((t: T) => boolean)[]): [T[]] {
    const toReturn = []
    ts.forEach(t => {
        predicates.forEach(pred => {

        })
    })
    return toReturn
}

// retry, logout, jump to bottom, pagination