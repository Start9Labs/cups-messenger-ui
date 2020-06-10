import { Component, OnInit, NgZone, ViewChild } from '@angular/core'
import { Contact, Message, AttendingMessage, FailedMessage, ServerMessage, server, mkAttending, mkFailed, ContactWithMessageMeta } from '../../services/cups/types'
import * as uuid from 'uuid'
import { NavController, IonContent } from '@ionic/angular'
import { Observable, of, Subscription, BehaviorSubject, Subject } from 'rxjs'
import { tap, filter, catchError, concatMap, take, delay, distinctUntilChanged, map, share } from 'rxjs/operators'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { config, LogTopic } from '../../config'
import { StateIngestionService } from '../../services/state/state-ingestion/state-ingestion.service'
import { Log } from '../../log'
import { exists, nonBlockingLoader } from 'src/rxjs/util'
import { ShowMessagesOptions } from 'src/app/services/cups/live-messenger'
import { sortByTimestampDESC } from 'src/app/util'
import { AppState } from 'src/app/services/state/app-state'
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
    initting = true

    @ViewChild('content') contentComponent: IonContent

    chatComponent: HTMLElement // listen for scroll events on this
    textInputComponent: HTMLElement // fix ios keyboard pop up bug using this and the above
    bottomOfChatElement: HTMLElement // detect at and scroll to bottom with this
    topOfChatElement: HTMLElement // detect at top for loading old messages with this

    contact: ContactWithMessageMeta
    shouldGetAllOldMessages = false
    $hasAllOldMessages$ = new BehaviorSubject(false)

    $newMessagesLoading$ = new BehaviorSubject(false)
    $previousMessagesLoading$ = new BehaviorSubject(false)

    // Messages w current status piped from app-state sorted by timestamp
    messagesForDisplay$: Observable<Message[]>

    $jumping$ = new BehaviorSubject(true)

    // Used for green highlights
    private $unreads$ = new BehaviorSubject(false)
    unreads$ = this.$unreads$.asObservable().pipe(distinctUntilChanged()) // only notify subs if things have changed

    // Synced to text entry field in UI
    messageToSend: string

    // newest rendered should be used to jump to last viewed in future iterations
    newestRendered: ServerMessage | undefined = undefined 
    // oldest rendered is used for fetching older messages
    oldestRendered: ServerMessage | undefined = undefined 

    // These will be unsubbed on ngOnDestroy
    private subsToTeardown: Subscription[] = []

    oldHeight: number

    constructor(
        private readonly nav: NavController,
        private readonly zone: NgZone,
        private readonly cups: CupsMessenger,
        private readonly stateIngestion: StateIngestionService,
        readonly app: AppState,
    ){
    }
    getContent() {
        return document.querySelector('ion-content')
    }

    ngAfterViewInit() {        
        this.shouldGetAllOldMessages = false
        this.chatComponent = document.getElementById('chat')
        this.textInputComponent = document.getElementById('textInput')
        this.bottomOfChatElement = document.getElementById('end-of-scroll')
        this.topOfChatElement = document.getElementById('start-of-scroll')

        this.subsToTeardown.push(
            // for tracking the bottom of the screen with message updates
            this.messagesForDisplay$.pipe(delay(150)).subscribe(() => {
                if(this.isAtBottom() || !this.$jumping$.getValue()) return
                this.jumpToBottom()
            })
        )

        this.initialMessageLoad().pipe(delay(250)).subscribe( ({contact, messages}) => {
            this.initting = false
            this.shouldGetAllOldMessages = messages.length >= config.loadMesageBatchSize
            this.$hasAllOldMessages$.next(!this.shouldGetAllOldMessages)
            Log.debug(`Loaded messages for ${contact.torAddress}`, messages, LogTopic.MESSAGES)
            // for jumping after initial page load completes
            this.jumpToBottom()
        })

        // for jumping to the bottom on page load
        this.jumpToBottom()
    }  

    ngOnInit() {
        this.oldHeight = window.innerHeight

        this.app.emitCurrentContact$.pipe(take(1)).subscribe(c => { 
            this.contact = c 
            this.app.dredgeMessageState(c).subscribe()
        })
        // html will subscribe to this to get message additions/updates

        this.messagesForDisplay$ = this.app.emitCurrentContact$.pipe(
            take(1), 
            concatMap(c => 
                this.app.emitMessages$(c.torAddress).pipe(map(ms => ms.sort(sortByTimestampDESC)))
            ),
            tap(messages => {
                const { updatedNewest } = this.updateRenderedMessageBoundary(
                    messages.filter(server)
                )
                
                if(this.isAtBottom()) { 
                    this.$jumping$.next(true)
                    return
                }
                
                this.$jumping$.next(false)
                if(updatedNewest) {
                    this.$unreads$.next(true)
                }
            }),
            share()
        )
    }

    handleResize(){
        let diff = this.oldHeight - window.innerHeight
        this.oldHeight = window.innerHeight

        this.contentComponent.scrollByPoint(0, diff, 100)
    }

    initialMessageLoad(){
        const c = this.contact
        const lastMessage = c.lastMessages[0]
        const justOneMessage = this.newestRendered === this.oldestRendered
        let loader: Subject<boolean>
        let options: ShowMessagesOptions
        
        if(lastMessage && justOneMessage){ //we have last message from contacts call, but have yet to make call for messages.
            loader = this.$previousMessagesLoading$
            options = { limit: config.loadMesageBatchSize, offset: { id: lastMessage.id, direction: 'before' } }
        } else {
            loader = this.$newMessagesLoading$
            options = {}
        }

        return nonBlockingLoader(
            this.stateIngestion.refreshMessages(c, options), 
            loader
        )
    }
    
    // Triggered by enabled infinite scroll
    oldMessageLoad() {
        if(this.oldestRendered){
            nonBlockingLoader(
                this.stateIngestion.refreshMessages(
                    this.contact, { limit: config.loadMesageBatchSize, offset: { direction: 'before', id: this.oldestRendered.id }}
                ),
                this.$previousMessagesLoading$
            ).subscribe({
                next: ({ messages }) => {
                    this.shouldGetAllOldMessages = messages.length >= config.loadMesageBatchSize
                    this.$hasAllOldMessages$.next(!this.shouldGetAllOldMessages)
                },
                error: e => {
                    Log.error('Exception fetching older messages for ' + this.contact.torAddress, e, LogTopic.MESSAGES)
                }
            })
        } 
    }

    ngOnDestroy(): void {
        this.subsToTeardown.forEach(s => s.unsubscribe())
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

    cancel(contact: Contact, message: FailedMessage) {
        this.app.removeMessage$(contact, message).subscribe(b => {
            Log.info(`Message trackingId ${message.trackingId} removed: `, b, LogTopic.MESSAGES)
        })
    }

    send(contact: Contact, message: AttendingMessage) {
        this.app.replaceContactMessages$({contact, messages: [message]}).pipe(
            tap(() => this.$jumping$.next(true)), 
            delay(150)
        ).subscribe(() => this.jumpToBottom())

        this.cups.messagesSend(contact, message.trackingId, message.text).pipe(
            catchError(e => {
                console.error(`send message failure`, e.message)
                const failedMessage = mkFailed({...message, failure: e.message})
                this.app.$ingestMessages.next( { contact, messages: [failedMessage] } )
                return of(null)
            }),
            filter(exists),
            tap(() => Log.info(`Message sent`, message.trackingId)),
            concatMap(() => this.stateIngestion.refreshMessages(contact))
        ).subscribe(() => {})
    }

    /* Jumping logic */
    async jumpToBottom(speed: 0 | 100 | 200 = 200) {
        this.contentComponent.scrollToBottom(speed)
        this.$unreads$.next(false)
    }

    onScrollEnd(){
        const top = this.isAtTop()
        if(top && this.shouldGetAllOldMessages) this.oldMessageLoad()
        
        if(this.isAtBottom()) { 
            this.$jumping$.next(true)
            this.$unreads$.next(false) 
        } else {
            this.$jumping$.next(false)
        }        
    }

    private updateRenderedMessageBoundary(
        serverMessages: ServerMessage[]
    ): { updatedOldest: boolean, updatedNewest: boolean }{
        const toReturn = { updatedOldest: false, updatedNewest: false }

        const oldestMessage = serverMessages[serverMessages.length - 1]
        const oldestRendered = this.oldestRendered
        if(oldestMessage && isOlder(oldestMessage, oldestRendered)){
            this.oldestRendered = oldestMessage
            toReturn.updatedOldest = true
        }

        const newestMessage = serverMessages.filter(server)[0]
        const newestRendered = this.newestRendered
        if(newestMessage && isNewer(newestMessage, newestRendered)){
            this.newestRendered = newestMessage
            toReturn.updatedNewest = true
        }

        return toReturn
    }

    isAtBottom(): boolean {
        return this.bottomOfChatElement ? isElementInViewport(this.bottomOfChatElement) : true
    }
    
    isAtTop(): boolean {
        return this.topOfChatElement ? isElementInViewport(this.topOfChatElement) : true
    }
}


function isElementInViewport (el) {
    var rect = el.getBoundingClientRect()
    return (
        rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
    )
}

function isOlder(a: { timestamp: Date }, b?: { timestamp: Date }) {
    return !b || new Date(a.timestamp) < new Date(b.timestamp)
}

function isNewer(a: { timestamp: Date }, b?: { timestamp: Date }) {
    return !b || new Date(a.timestamp) > new Date(b.timestamp)
}
