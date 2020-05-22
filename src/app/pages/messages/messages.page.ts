import { Component, OnInit, ViewChild, NgZone } from '@angular/core'
import { Contact, Message, AttendingMessage, FailedMessage, ServerMessage, server, mkAttending, mkFailed } from '../../services/cups/types'
import * as uuid from 'uuid'
import { NavController, LoadingController } from '@ionic/angular'
import { Observable, of, combineLatest, Subscription, BehaviorSubject } from 'rxjs'
import { map, switchMap, tap, filter, take, catchError, concatMap, delay, distinctUntilChanged } from 'rxjs/operators'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { config, LogLevel, LogTopic } from '../../config'
import { App } from '../../services/state/app-state'
import { StateIngestionService } from '../../services/state/state-ingestion/state-ingestion.service'
import { Log } from '../../log'
import { exists, overlayLoader } from 'src/rxjs/util'


/*
1.) Entering message page needs loader for initial messages
2.) Messages load we should jump to the bottom
3.) If we're at the bottom and new messages come in, we should jump to bottom
*/

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
    $unreads$ = new BehaviorSubject(false)

    // Synced to text entry field in UI
    messageToSend: string

    // Save particular data about what to view. Timestamps can be moved to DB in future iterations.
    // newest rendered should be used to jump to last viewed in future iterations
    // oldest rendered is used for fetching older messages
    metadata: { [ tor: string ]: {
        hasAllHistoricalMessages: boolean
        newestRendered: ServerMessage | undefined
        oldestRendered: ServerMessage | undefined
    }} = {}

    myTorAddress = config.myTorAddress

    // These will be unsubbed on ngOnDestroy
    private ngOnInitSubs: Subscription[] = []

    constructor(
        private readonly nav: NavController,
        private readonly zone: NgZone,
        private readonly cups: CupsMessenger,
        private readonly stateIngestion: StateIngestionService,
        private readonly loadingCtrl: LoadingController
    ){
        // html will subscribe to this to get message additions/updates
        this.messagesForDisplay$ = App.emitCurrentContact$.pipe(switchMap(c =>
            App.emitMessages$(c.torAddress).pipe(tap(() => {
                // before new messages will appear we check if we're at the bottom of the page,
                // if so we stay at the bottom
                if(isAtBottom()){ this.jumpToBottom() }
            }))
        ))

    }

    ngOnInit() {
        // If we view a new contact, we should jump to the bottom of the page
        App.emitCurrentContact$.pipe(
            distinctUntilChanged((c1, c2) => c1.torAddress === c2.torAddress),
            concatMap(c =>
                overlayLoader(this.stateIngestion.refreshMessages(c), this.loadingCtrl, 'Fetching messages...')
            ),
            delay(100) // this allows the page to render, then we jump to bottom
        ).subscribe(({ contact, messages }) => {
            if(messages.length < config.loadMesageBatchSize) this.getMetadata(contact.torAddress).hasAllHistoricalMessages = true
            this.jumpToBottom()
        })

        // Every time new messages or current contact changes, we update the oldest and newest message that's been loaded.
        // if we receive a new inbound messages, and we're not at the bottom of the screen, then we have unreads
        this.ngOnInitSubs.push(combineLatest([App.emitCurrentContact$, this.messagesForDisplay$]).subscribe(
            ([c, messages]) => {
                const { updatedNewest } = this.updateViewedMessageEndpoints(c, messages.filter(server))
                if(updatedNewest) {
                    this.$unreads$.next(!isAtBottom())
                }
            }
        ))
    }

    ionViewWillEnter(){
        this.jumpToBottom(0) // blech, we also need this in case we navigate to the page from the back button on the profile page
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

    // Can send with shift+return key on desktop
    checkSubmit (e: any, contact: Contact) {
        if (e.keyCode === 13) this.sendMessage(contact)
      }

    sendMessage(contact: Contact) {
        const attendingMessage = mkAttending({
            direction: 'Outbound',
            otherParty: contact,
            text: this.messageToSend,
            sentToServer: new Date(),
            trackingId: uuid.v4(),
        })
        Log.info(`sending message ${JSON.stringify(attendingMessage, null, '\t')}`)
        this.send(contact, attendingMessage)
        this.messageToSend = ''
    }

    retry(contact: Contact, failedMessage: FailedMessage) {
        const retryMessage = mkAttending({...failedMessage, sentToServer: new Date(), failure: undefined} as FailedMessage)
        this.send(contact, retryMessage)
    }

    send(contact: Contact, message: AttendingMessage) {
        App.alterContactMessages$({contact, messages: [message]}).subscribe( () => {
            this.jumpToBottom()
        })
        this.cups.messagesSend(contact, message.trackingId, message.text).pipe(
            catchError(e => {
                console.error(`send message failure`, e.message)
                const failedMessage = mkFailed({...message, failure: e.message})
                App.$ingestMessages.next( { contact, messages: [failedMessage] } )
                return of(null)
            }),
            filter(exists),
            tap(() => Log.info(`Message sent`, message.trackingId)),
            concatMap(() => this.stateIngestion.refreshMessages(contact))
        ).subscribe({
            next: () => {
                this.$unreads$.next(false); this.jumpToBottom()
            },
        })
    }

    /* Jumping logic */

    async jumpToBottom(timeToScroll = 200) {
        if(this.content) { this.content.scrollToBottom(timeToScroll) }
        this.$unreads$.next(false)
    }

    // TODO: this needs to find the lastviewed element and jump there. Presently we just jump to the bottom, which is meh.
    async jumpToLastViewed() {
        this.jumpToBottom()
    }

    onScrollEnd(){
        if(isAtBottom()){ this.$unreads$.next(false) }
    }

    /* older message logic */
    fetchOlderMessages(event: any, contact: Contact) {
        const messagesToRetrieve = config.loadMesageBatchSize
        const oldestRendered = this.getMetadata(contact.torAddress).oldestRendered
        if(oldestRendered){
            this.stateIngestion.refreshMessages(
                contact, { limit: messagesToRetrieve, offset: { direction: 'before', id: oldestRendered.id }}
            ).subscribe({
                next: ({ messages }) => {
                    if(messages.length < messagesToRetrieve){
                        Log.debug(`fetched all historical messages`)
                        this.getMetadata(contact.torAddress).hasAllHistoricalMessages = true
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

    private updateViewedMessageEndpoints(
        c: Contact, serverMessages: ServerMessage[]
    ): { updatedOldest: boolean, updatedNewest: boolean }{
        const toReturn = { updatedOldest: false, updatedNewest: false }

        const oldestMessage = serverMessages[serverMessages.length - 1]
        const oldestRendered = this.getMetadata(c.torAddress).oldestRendered
        if(oldestMessage && isOlder(oldestMessage, oldestRendered)){
            this.getMetadata(c.torAddress).oldestRendered = oldestMessage
            toReturn.updatedOldest = true
        }

        const newestMessage = serverMessages.filter(server)[0]
        const newestRendered = this.getMetadata(c.torAddress).newestRendered
        if(newestMessage && isNewer(newestMessage, newestRendered)){
            this.getMetadata(c.torAddress).newestRendered = newestMessage
            toReturn.updatedNewest = true
        }

        return toReturn
    }

    private getMetadata(tor: string){
        if(!this.metadata[tor]){
            this.metadata[tor] = { hasAllHistoricalMessages: false, newestRendered: undefined, oldestRendered: undefined }
        }
        return this.metadata[tor]
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