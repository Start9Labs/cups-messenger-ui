import { Component, OnInit, ViewChild } from '@angular/core'
import { Contact,
        Message,
        AttendingMessage,
        FailedMessage,
        ServerMessage,
        server,
        mkAttending,
        mkFailed,
        ContactWithMessageMeta,
        pauseFor
} from '../../services/cups/types'
import * as uuid from 'uuid'
import { NavController, IonContent } from '@ionic/angular'
import { Observable, of, Subscription, BehaviorSubject, Subject, interval } from 'rxjs'
import { tap, filter, catchError, concatMap, take, delay, distinctUntilChanged, map, share, throttleTime, skip } from 'rxjs/operators'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { config, LogTopic } from '../../config'
import { StateIngestionService } from '../../services/state/state-ingestion/state-ingestion.service'
import { Log } from '../../log'
import { exists, nonBlockingLoader, overlayLoader } from 'src/rxjs/util'
import { sortByTimestampDESC } from 'src/app/util'
import { AppState } from 'src/app/services/state/app-state'

@Component({
  selector: 'app-messages',
  templateUrl: './messages.page.html',
  styleUrls: ['./messages.page.scss'],
})
export class MessagesPage implements OnInit {
    initting = true

    @ViewChild('content') contentComponent: IonContent

    chatElement: HTMLElement // listen for scroll events on this
    textInputElement: HTMLElement // fix ios keyboard pop up bug using this and the above
    bottomOfChatElement: HTMLElement // detect at and scroll to bottom with this
    topOfChatElement: HTMLElement // detect at top for loading old messages with this

    contact: ContactWithMessageMeta

    // Loading old messages
    oldMessagesLoadEnabled = false //Becomes true after initial load, and becomes false when hasAllOldMessages becomes true.
    $hasAllOldMessages$ = new BehaviorSubject(false) // Becomes true when all old messages acquired. Renders 'no more messages' in app.
    $oldMessagesLoading$ = new BehaviorSubject(false) // Used to manage the old message loader

    // Messages w current status piped from app-state sorted by timestamp
    messagesForDisplay$: Observable<Message[]>

    // When true, the UI will scroll down when new messages are sent/received
    $trackWithNewMessages$ = new BehaviorSubject(true)
    
    // Used for highlights
    private $unreads$ = new BehaviorSubject(false)
    unreads$ = this.$unreads$.asObservable().pipe(distinctUntilChanged()) // only notify subs if things have changed

    // Synced to text entry field in UI
    messageToSend: string

    // newest rendered should be used to jump to last viewed in future iterations
    latestRendered: ServerMessage | undefined = undefined 
    // oldest rendered is used for fetching older messages
    earliestRendered: ServerMessage | undefined = undefined 

    // shows that page is manually refreshing
    $refreshing$ = new BehaviorSubject(false)

    // These will be unsubbed on ngOnDestroy
    private subsToTeardown: Subscription[] = []
    private renderedMessageCount = 0
    oldHeight: number

    constructor(
        private readonly nav: NavController,
        private readonly cups: CupsMessenger,
        private readonly stateIngestion: StateIngestionService,
        readonly app: AppState,
    ){}

    getContent() {
        return document.querySelector('ion-content')
    }

    ngOnInit() {
        this.oldHeight = window.innerHeight
        // html will subscribe to this to get message additions/updates
        this.messagesForDisplay$ = this.app.emitCurrentContact$.pipe(
            take(1), 
            tap(c => {
                this.contact = c 
                this.app.pullMessageStateFromStore(this.contact).subscribe()
            }),
            concatMap(c => 
                this.app.emitMessages$(c.torAddress).pipe(map(ms => ms.sort(sortByTimestampDESC)))
            ),
            tap(messages => {
                this.renderedMessageCount = messages.length

                const { updatedNewest } = this.updateNewestAndEarliestMessages(
                    messages.filter(server)
                )
                
                if(this.isAtBottom()) { 
                    this.$trackWithNewMessages$.next(true)
                    return
                }
                
                this.$trackWithNewMessages$.next(false)
                if(updatedNewest) {
                    this.$unreads$.next(true)
                }
            }),
            share()
        )
    }

    ngAfterViewInit() {        
        this.oldMessagesLoadEnabled = false
        this.initDocumentComponents()
        this.subsToTeardown.push(
            this.jumpToBottomWithNewMessages(),
        )

        this.initialMessageLoad().pipe(delay(250)).subscribe(({ messages }) => {
            this.initting = false
            this.oldMessagesLoadEnabled = messages.length >= config.loadMesageBatchSize
            this.$hasAllOldMessages$.next(!this.oldMessagesLoadEnabled)
        })

        // for jumping to the bottom on page load
        this.jumpToBottom()
    }

    ngOnDestroy(): void { 
        this.subsToTeardown.forEach(s => s.unsubscribe())
    }

    initialMessageLoad(){
        const c = this.contact
        const lastMessage = c.lastMessages[0]
    
        /* 
            If we have fewer than loadMesageBatchSize messages on the screen, but we know there's nothing more recent, 
            we attempt to get up to loadMesageBatchSize messages from the past. Otherwise we fetch newer messages.
        */
        if(c.unreadMessages === 0 && lastMessage && this.renderedMessageCount < config.loadMesageBatchSize){ 
            return nonBlockingLoader(
                this.stateIngestion.refreshMessages(c, 
                    { limit: config.loadMesageBatchSize, offset: { id: lastMessage.id, direction: 'before' } }
                ), 
                this.$oldMessagesLoading$
            )
        } else {
            return this.stateIngestion.refreshMessages(c, {})
        }
    }


    private jumpToBottomWithNewMessages(): Subscription {
        return this.messagesForDisplay$.pipe(delay(150)).subscribe(() => {
            if(this.isAtBottom() || !this.$trackWithNewMessages$.getValue()) return
            this.jumpToBottom()
        })
    }

    private initDocumentComponents(){
        this.chatElement = document.getElementById('chat')
        this.textInputElement = document.getElementById('textInput')
        this.bottomOfChatElement = document.getElementById('end-of-scroll')
        this.topOfChatElement = document.getElementById('start-of-scroll')
    }
    
    // Navigation Buttons
    toProfile(){
        this.nav.navigateForward('profile')
    }

    // Triggered by enabled infinite scroll
    oldMessageLoad() {
        if(this.earliestRendered){
            nonBlockingLoader(
                this.stateIngestion.refreshMessages(
                    this.contact, { limit: config.loadMesageBatchSize, offset: { direction: 'before', id: this.earliestRendered.id }}
                ),
                this.$oldMessagesLoading$
            ).subscribe({
                next: ({ messages }) => {
                    this.oldMessagesLoadEnabled = messages.length >= config.loadMesageBatchSize
                    this.$hasAllOldMessages$.next(!this.oldMessagesLoadEnabled)
                },
                error: e => {
                    Log.error('Exception fetching older messages for ' + this.contact.torAddress, e, LogTopic.MESSAGES)
                }
            })
        } 
    }

    async refresh(){
        this.stateIngestion.refreshMessages(this.contact, {}).subscribe()
        nonBlockingLoader(this.app.emitMessages$(this.contact.torAddress).pipe(skip(1)), this.$refreshing$).subscribe()
    }

    /* Sending + Retrying Message */
    send(contact: Contact) {
        const attendingMessage = mkAttending({
            direction: 'Outbound',
            otherParty: contact,
            text: this.messageToSend,
            sentToServer: new Date(),
            trackingId: uuid.v4(),
        })
        Log.info(`sending message ${JSON.stringify(attendingMessage, null, '\t')}`)
        this.sendMessage(contact, attendingMessage)
        this.messageToSend = ''
    }

    retry(contact: Contact, failedMessage: FailedMessage) {
        const retryMessage = mkAttending({...failedMessage, sentToServer: new Date(), failure: undefined} as FailedMessage)
        this.sendMessage(contact, retryMessage)
    }

    cancel(contact: Contact, message: FailedMessage) {
        this.app.removeMessage$(contact, message).subscribe(b => {
            Log.info(`Message trackingId ${message.trackingId} removed: `, b, LogTopic.MESSAGES)
        })
    }

    private sendMessage(contact: Contact, message: AttendingMessage) {
        this.app.forceMessagesUpdate$({contact, messages: [message]}).pipe(
            tap(() => this.$trackWithNewMessages$.next(true)), 
            delay(150)
        ).subscribe(() => this.jumpToBottom())

        this.cups.messagesSend(contact, message.trackingId, message.text).pipe(
            catchError(e => {
                console.error(`send message failure`, e.message)
                const failedMessage = mkFailed({...message, failure: e.message || `${e}`})
                this.app.$ingestMessages.next( { contact, messages: [failedMessage] } )
                return of(null)
            }),
            filter(exists),
            tap(() => Log.info(`Message sent`, message.trackingId)),
            concatMap(() => this.stateIngestion.refreshMessages(contact))
        ).subscribe()
    }

    onKeyPress(e){
        if(e.key === 'Enter' && !e.shiftKey){
            e.preventDefault()
            if(this.messageToSend && this.messageToSend.length){
                this.send(this.contact)
            }
        }
    }

    /* Jumping logic */
    jumpToBottom(speed: 0 | 100 | 200 = 200) {
        this.contentComponent.scrollToBottom(speed)
        this.$unreads$.next(false)
    }

    async onScrollStart(){
        await pauseFor(200)
        this.onScrollEnd()
    }

    onScrollEnd(){
        const top = this.isAtTop()
        if(top && this.oldMessagesLoadEnabled) this.oldMessageLoad()
        
        if(this.isAtBottom()) { 
            this.$trackWithNewMessages$.next(true)
            this.$unreads$.next(false) 
        } else {
            this.$trackWithNewMessages$.next(false)
        }        
    }

    private updateNewestAndEarliestMessages(
        serverMessages: ServerMessage[]
    ): { updatedOldest: boolean, updatedNewest: boolean }{
        const toReturn = { updatedOldest: false, updatedNewest: false }

        const oldestMessage = serverMessages[serverMessages.length - 1]
        const oldestRendered = this.earliestRendered
        if(oldestMessage && isOlder(oldestMessage, oldestRendered)){
            this.earliestRendered = oldestMessage
            toReturn.updatedOldest = true
        }

        const newestMessage = serverMessages.filter(server)[0]
        const newestRendered = this.latestRendered
        if(newestMessage && isNewer(newestMessage, newestRendered)){
            this.latestRendered = newestMessage
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

    handleResize(){
        let diff = this.oldHeight - window.innerHeight
        this.oldHeight = window.innerHeight

        if(!this.isAtBottom()){
            this.contentComponent.scrollByPoint(0, diff, 100)
        }
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
