import { Component, OnInit, ViewChild, NgZone } from '@angular/core'
import { Contact, Message, AttendingMessage, FailedMessage, ServerMessage, server } from '../../services/cups/types'
import * as uuid from 'uuid'
import { NavController } from '@ionic/angular'
import { Observable, of, combineLatest, Subscription } from 'rxjs'
import { map, switchMap, tap, filter, take, catchError, concatMap } from 'rxjs/operators'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { config } from '../../config'
import { App } from '../../services/state/app-state'
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

    // Used to determine whether we should present jump button
    unreads = false

    // Synced to text entry field in UI
    messageToSend: string

    // Save particular data about what to view. Timestamps can be moved to DB hypothetically.
    metadata: { [ tor: string ]: {
        hasAllHistoricalMessages: boolean
        newestRendered: ServerMessage | undefined
        oldestRendered: ServerMessage | undefined
    }}

    myTorAddress = config.myTorAddress

    // These will be unsubbed on ngOnDestroy
    private ngOnInitSubs: Subscription[]

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

    ngOnInit() {
        // If we view a new contact, we should begin where we last left off
        // (See MDNs IntersectionObserver for tracking read messages for a potential option)
        this.ngOnInitSubs.push(App.emitCurrentContact$.subscribe(c => {
            this.jumpToLastViewed()
        }))

        // Every time new messages or current contact changes, we update the oldest and newest message that's been loaded.
        // if we receive a new inbound messages, and we're not at the bottom of the screen, then we have unreads
        this.ngOnInitSubs.push(combineLatest([App.emitCurrentContact$, this.messagesForDisplay$]).subscribe(
            ([c, messages]) => {
                const { updatedNewest } = this.updateViewedMessageEndpoints(c, messages.filter(server))
                if(updatedNewest) {
                    this.unreads = !isAtBottom()
                }
            }
        ))
    }

    ngOnDestroy(): void {
        return this.ngOnInitSubs.forEach(s => s.unsubscribe())
    }

    /* Navigation Buttons */


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

    /* Sending + Retrying Message */

    // Can send with return on desktop
    checkSubmit (e: any, contact: Contact) {
        if (e.keyCode === 13) {
          this.sendMessage(contact)
        }
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

        this.cups.messagesSend(contact, message.trackingId, message.text).pipe(
            catchError(e => {
                console.error(`send message failure`, e.message)
                App.$ingestMessages.next( { contact, messages: [{...message, failure: e.message}] } )
                return of(null)
            }),
            filter(exists),
            tap(() => Log.info(`Message sent ${JSON.stringify(message.trackingId, null, '\t')}`)),
            concatMap(() => this.stateIngestion.refreshMessages(contact))
        ).subscribe({
            next: () => {
                this.unreads = false; this.jumpToBottom()
            },
        })
    }

    /* Jumping logic */

    async jumpToBottom() {
        if(this.content) { this.content.scrollToBottom(200) }
    }

    // TODO: this needs to find the lastviewed element and jump there. Presently we just jump to the bottom, which is meh.
    async jumpToLastViewed() {
        this.jumpToBottom()
    }

    onScrollEnd(){
        if(isAtBottom()){ this.unreads = false }
    }

    /* older message logic */

    fetchOlderMessages(event: any, contact: Contact) {
        const messagesToRetrieve = 15
        const oldestRendered = this.metadata[contact.torAddress].oldestRendered
        if(oldestRendered){
            this.stateIngestion.refreshMessages(
                contact, { limit: messagesToRetrieve, offset: { direction: 'before', id: oldestRendered.id }}
            ).subscribe({
                next: ({ messages }) => {
                    if(messages.length < messagesToRetrieve){
                        Log.debug(`fetched all historical messages`)
                        this.metadata[contact.torAddress].hasAllHistoricalMessages = true
                    }
                    event.target.complete()
                },
                error: e => {
                    console.error(e.message)
                    event.target.complete()
                }
            })
        }
    }

    private  updateViewedMessageEndpoints(
        c: Contact, serverMessages: ServerMessage[]
    ): { updatedOldest: boolean, updatedNewest: boolean }{
        const toReturn = { updatedOldest: false, updatedNewest: false }

        const oldestMessage = serverMessages[serverMessages.length - 1]
        const oldestRendered = this.metadata[c.torAddress].oldestRendered
        if(oldestMessage && isOlder(oldestMessage, oldestRendered)){
            this.metadata[c.torAddress].oldestRendered = oldestMessage
            toReturn.updatedOldest = true
        }

        const newestMessage = serverMessages.filter(server)[0]
        const newestRendered = this.metadata[c.torAddress].newestRendered
        if(newestMessage && isNewer(newestMessage, newestRendered)){
            this.metadata[c.torAddress].newestRendered = newestMessage
            toReturn.updatedNewest = true
        }

        return toReturn
    }
}

function isAtBottom(): boolean {
    const el = document.getElementById('end-of-scroll')
    return el ? isElementInViewport(el) : true
}

// returns true if the TOP of the element is in the view port.
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect()
    return rect.top < window.innerHeight && rect.bottom >= 0
}

function isOlder(a: { timestamp: Date }, b?: { timestamp: Date }) {
    return !b || a.timestamp < b.timestamp
}

function isNewer(a: { timestamp: Date }, b?: { timestamp: Date }) {
    return !b || a.timestamp > b.timestamp
}