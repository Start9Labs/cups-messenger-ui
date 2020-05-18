import { Component, OnInit, ViewChild, NgZone } from '@angular/core'
import { Contact, Message, pauseFor, AttendingMessage, FailedMessage, ServerMessage, inbound, InboundMessage, server } from '../../services/cups/types'
import * as uuid from 'uuid'
import { NavController } from '@ionic/angular'
import { Observable, Subscription, BehaviorSubject, of, from, combineLatest } from 'rxjs'
import { map, delay, switchMap, tap, filter, take, catchError } from 'rxjs/operators'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { config } from '../../config'
import { App } from '../../services/state/app-state'
import { Auth } from '../../services/state/auth-state'
import { StateIngestionService } from '../../services/state/state-ingestion/state-ingestion.service'
import { Log } from '../../log'
import { exists } from 'src/rxjs/util'

@Component({
  selector: 'app-messages',
  templateUrl: './messages.page.html',
  styleUrls: ['./messages.page.scss'],
})
export class MessagesPage implements OnInit {
    @ViewChild('content') private content: any

    app = App

    // Messages w current status piped from app-state sorted by timestamp
    messagesForDisplay$: Observable<Message[]>

    // Detecting a new message
    unreads = false

    // Sending messages
    messageToSend: string

    // Save particular data about what to view. Timestamps can be moved to DB hypothetically.
    viewingMetadata: { [ tor: string ]: {
        hasAllHistoricalMessages: boolean
        newestViewed: ServerMessage | undefined
        oldestViewed: ServerMessage | undefined
    }}

    myTorAddress = config.myTorAddress

    constructor(
        private readonly nav: NavController,
        private readonly zone: NgZone,
        private readonly cups: CupsMessenger,
        private readonly stateIngestion: StateIngestionService
    ){
        this.messagesForDisplay$ = App.emitCurrentContact$.pipe(switchMap(c =>
            App.emitMessages$(c.torAddress)
        ))
    }


    /* jumping behavior:
    - if you are on the page but cannot see the bottom, and a new inbound message arrives you should get the option to jump
    - if you view a new contact, you should be presented with messages beginning at the last one you saw
    */

    ngOnInit() {
        // if we receive a new inbound messages, and we're not at the bottom of the screen, then we have unreads
        this.messagesForDisplay$.pipe(filter(newInboundMessage)).subscribe(() => {
            this.unreads = !this.isAtBottom()
        })

        // if we view a new contact, we should begin where we last left off
        // See MDNs IntersectionObserver for tracking read messages
        App.emitCurrentContact$.subscribe(c => {
            this.jumpToLastViewed(c.torAddress)
        })

        combineLatest([App.emitCurrentContact$, this.messagesForDisplay$]).subscribe(
            ([c, messages]) => {
                const oldestMessage = messages[messages.length - 1]
                const currentOldestViewed = this.viewingMetadata[c.torAddress].oldestViewed

                if(oldestMessage && server(oldestMessage)){
                    if(!currentOldestViewed || oldestMessage.timestamp < currentOldestViewed.timestamp){
                        this.viewingMetadata[c.torAddress].oldestViewed = oldestMessage
                    }
                }

                const newestMessage = messages.filter(server)[0]
                const currentNewestViewed = this.viewingMetadata[c.torAddress].newestViewed
                if(newestMessage){
                    if(!currentNewestViewed || newestMessage.timestamp > currentNewestViewed.timestamp){
                        this.viewingMetadata[c.torAddress].newestViewed = newestMessage
                    }
                }
            }
        )
    }

    async checkSubmit (e: any, contact: Contact) {
      if (e.keyCode === 13) {
        await this.sendMessage(contact)
      }
    }

    toProfile(){
        this.zone.run(() => {
            this.nav.navigateForward('profile')
        })
    }

    toContacts(){
        this.zone.run(() => {
            this.nav.navigateBack('contacts')
        })
    }

    wipeCurrentContact(){
        App.alterCurrentContact$(undefined)
    }

    sendMessage(contact: Contact) {
        const attendingMessage: AttendingMessage = {
            sentToServer: new Date(),
            direction: 'Outbound',
            otherParty: contact,
            text: this.messageToSend,
            trackingId: uuid.v4(),
            id: undefined,
            timestamp: undefined,
            failure: undefined
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
        App.$ingestMessages.next({contact, messages: [message]})

        this.cups.messagesSend(contact, message.trackingId, message.text).pipe(catchError(e => {
            console.error(`send message failure`, e.message)
            App.$ingestMessages.next( { contact, messages: [{...message, failure: e.message}] } )
            return of(undefined)
        })).subscribe({
            next: () => {
                Log.info(`Message sent ${JSON.stringify(message.trackingId, null, '\t')}`)
                this.stateIngestion.refreshMessages(contact)
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
        const messagesToRetrieve = 15
        // event.target.complete()
        const oldestViewed = this.viewingMetadata[contact.torAddress].oldestViewed
        if(oldestViewed){
            this.cups.messagesShow(contact, { limit: messagesToRetrieve, offset: { direction: 'before', id: m.id }} )
        }
        

        App.emitOldestServerMessage$(contact).pipe(
            filter(_ => !!this.viewingMetadata[contact.torAddress].hasAllHistoricalMessages),
            tap(m => message = m),
            take(1),
            switchMap(m => ),
            map(ms => ({ contact, messages: ms }))
        ).subscribe( {
            next: res => {
                if(res.messages.length === 0) {
                    Log.debug(`fetched all historical messages`)
                    this.viewingMetadata[contact.torAddress].hasAllHistoricalMessages = true
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