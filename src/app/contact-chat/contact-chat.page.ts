import { Component, OnInit, ViewChild } from '@angular/core'
import { Contact, MessageBase, pauseFor, AttendingMessage, FailedMessage, ServerMessage } from '../services/cups/types'
import * as uuid from 'uuid'
import { NavController } from '@ionic/angular'
import { Observable, Subscription, BehaviorSubject, of, from } from 'rxjs'
import { map, delay, switchMap, tap, filter, take, catchError } from 'rxjs/operators'
import { CupsMessenger } from '../services/cups/cups-messenger'
import { config } from '../config'
import { App } from '../services/state/app-state'
import { Auth } from '../services/state/auth-state'
import { StateIngestionService } from '../services/state-ingestion/state-ingestion.service'
import { Log } from '../log'

@Component({
  selector: 'app-contact-chat',
  templateUrl: './contact-chat.page.html',
  styleUrls: ['./contact-chat.page.scss'],
})
export class ContactChatPage implements OnInit {
    @ViewChild('content') private content: any

    currentContactTorAddress: string
    currentContact$: BehaviorSubject<Contact> = new BehaviorSubject(undefined)
    contactMessages$: Observable<MessageBase[]> = new Observable()
    contactMessages: MessageBase[] = []
    // Detecting a new message
    unreads = false

    // Sending messages
    messageToSend: string

    // Updating a contact
    addContactNameForm = false
    contactNameToAdd: string
    updatingContact$ = new BehaviorSubject(false)

    error$: BehaviorSubject<string> = new BehaviorSubject(undefined)
    globe = {...App, ...Auth}

    shouldJump = false
    jumpSub: Subscription
    mostRecentMessageTime: Date = new Date(0)
    oldestMessage: MessageBase
    canGetOlderMessages = false

    hasAllHistoricalMessages: { [tor: string]: true } = {}
    myTorAddress = config.myTorAddress

    constructor(
        private readonly navCtrl: NavController,
        private readonly cups: CupsMessenger,
        private readonly stateIngestion: StateIngestionService
    ){
        App.emitCurrentContact$.subscribe(c => {
            if(!c) return
            this.contactMessages$ = App.emitMessages$(c.torAddress).pipe(map(ms => {
                this.shouldJump = this.isAtBottom()
                if(this.shouldJump) { this.unreads = false }
                this.oldestMessage = ms[ms.length - 1]
                return ms
            }))

            if(this.jumpSub) { this.jumpSub.unsubscribe() }

            this.jumpSub = this.contactMessages$.pipe(delay(150)).subscribe(ms => {
                const mostRecent = ms[0]
                if(this.shouldJump){
                    this.unreads = false
                    this.jumpToBottom()
                    this.shouldJump = false
                } else if (mostRecent && mostRecent.timestamp && mostRecent.timestamp > this.mostRecentMessageTime) {
                    this.unreads = true
                }
                this.mostRecentMessageTime = (mostRecent && mostRecent.timestamp) || this.mostRecentMessageTime
            })

            this.currentContactTorAddress = c.torAddress
            this.stateIngestion.refreshMessages(c)
        })
    }

    ngOnInit() {
        if (!Auth.password) {
            this.navCtrl.navigateRoot('signin')
        }
        this.stateIngestion.refreshContacts()
        this.canGetOlderMessages = this.isAtTop()
    }

    async checkSubmit (e: any, contact: Contact) {
      if (e.keyCode === 13) {
        await this.sendMessage(contact)
      }
    }

    sendMessage(contact: Contact) {
        const attendingMessage: AttendingMessage = {
            sentToServer: new Date(),
            direction: 'Outbound',
            otherParty: contact,
            text: this.messageToSend,
            trackingId: uuid.v4(),
        }
        Log.info(`sending message ${JSON.stringify(attendingMessage, null, '\t')}`)
        this.send(contact, attendingMessage)
        this.messageToSend = ''
    }

    retry(contact: Contact, failedMessage: FailedMessage) {
        const retryMessage = {...failedMessage, sentToServer: new Date() }
        delete retryMessage.failure
        this.send(contact, retryMessage as AttendingMessage)
    }

    send(contact: Contact, message: AttendingMessage) {
        of({contact, messages: [message]}).subscribe(App.$ingestMessages)

        this.cups.messagesSend(contact, message.trackingId, message.text).pipe(catchError(e => {
            console.error(`send message failure`, e.message)
            App.$ingestMessages.next( { contact, messages: [{...message, failure: e.message}] } )
            return of(undefined)
        })).subscribe({
            next: () => {
                Log.info(`Message sent ${JSON.stringify(message.trackingId, null, '\t')}`)
                this.stateIngestion.refreshMessages(contact)
                of(message).pipe(delay(config.defaultServerTimeout)).subscribe(() => {
                    App.$ingestMessages.next( { contact, messages: [{...message, failure: 'timeout'}] } )
                })
            },
        })

        pauseFor(125).then(() => {
            this.unreads = false; this.jumpToBottom()
        })
    }

    async jumpToBottom() {
        if(this.content) { this.content.scrollToBottom(200) }
    }

    onScrollEnd(){
        if(this.isAtBottom()){ this.unreads = false }
    }

    fetchOlderMessages(event: any, contact: Contact) {
        let message: ServerMessage | undefined
        // event.target.complete()
        App.emitOldestServerMessage$(contact).pipe(
            filter(_ => !!this.hasAllHistoricalMessages[contact.torAddress]),
            tap(m => message = m),
            take(1),
            switchMap(m => this.cups.messagesShow(contact, { offset: { direction: 'before', id: m.id }} )),
            map(ms => ({ contact, messages: ms }))
        ).subscribe( {
            next: res => {
                if(res.messages.length === 0) {
                    Log.debug(`fetched all historical messages`)
                    this.hasAllHistoricalMessages[contact.torAddress] = true
                }
                App.$ingestMessages.next(res)
                event.target.complete()
            },
            error: (e : Error) => {
                console.error(e.message)
                App.$ingestMessages.next( { contact, messages: [{...message, failure: e.message}] } )
                event.target.complete()
            }
        })
    }

    isAtBottom(): boolean {
        const el = document.getElementById('end-of-scroll')
        return el ? isElementInViewport(el) : true
    }

    isAtTop(): boolean {
        const el = document.getElementById('top-of-scroll')
        return el ? isElementInViewport(el) : true
    }

    ngOnDestroy(): void {
        return this.jumpSub && this.jumpSub.unsubscribe()
    }
}

// returns true if the TOP of the element is in the view port.
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect()
    return rect.top < window.innerHeight && rect.bottom >= 0
}