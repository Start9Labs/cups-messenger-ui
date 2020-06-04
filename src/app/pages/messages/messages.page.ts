import { Component, OnInit, NgZone, ViewChild } from '@angular/core'
import { Contact, Message, AttendingMessage, FailedMessage, ServerMessage, server, mkAttending, mkFailed, ContactWithMessageMeta } from '../../services/cups/types'
import * as uuid from 'uuid'
import { NavController, IonContent } from '@ionic/angular'
import { Observable, of, Subscription, BehaviorSubject, Subject, fromEvent, concat, timer } from 'rxjs'
import { tap, filter, catchError, concatMap, take, delay, distinctUntilChanged, map, debounceTime } from 'rxjs/operators'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { config, LogTopic } from '../../config'
import { App } from '../../services/state/app-state'
import { StateIngestionService } from '../../services/state/state-ingestion/state-ingestion.service'
import { Log } from '../../log'
import { exists, nonBlockingLoader } from 'src/rxjs/util'
import { ShowMessagesOptions } from 'src/app/services/cups/live-messenger'
import { sortByTimestampDESC } from 'src/app/util'
// import * as s from '@svgdotjs/svg.js'
// const SVG = s.SVG
/*
1.) Entering message page needs loader for initial messages
2.) Messages load we should jump to the bottom
3.) If we're at the bottom and new messages come in, we should jump to bottom
*/
const wanydow = window as any
@Component({
  selector: 'app-messages',
  templateUrl: './messages.page.html',
  styleUrls: ['./messages.page.scss'],
})
export class MessagesPage implements OnInit {
    @ViewChild('content') contentComponent: IonContent

    chatComponent: HTMLElement // listen for scroll events on this
    textInputComponent: HTMLElement // fix ios keyboard pop up bug using this and the above
    bottomOfChatElement: HTMLElement // detect at and scroll to bottom with this
    topOfChatElement: HTMLElement // detect at top for loading old messages with this
    mutationObserver: MutationObserver // notifies when chat list has changed

    app = App
    contact: ContactWithMessageMeta
    shouldGetAllOldMessages = false
    $hasAllOldMessages$ = new BehaviorSubject(false)

    $newMessagesLoading$ = new BehaviorSubject(false)
    $previousMessagesLoading$ = new BehaviorSubject(false)

    // Messages w current status piped from app-state sorted by timestamp
    messagesForDisplay$: Observable<Message[]>

    jumping = false

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

    constructor(
        private readonly nav: NavController,
        private readonly zone: NgZone,
        private readonly cups: CupsMessenger,
        private readonly stateIngestion: StateIngestionService,
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

        this.jumping = true 

        this.mutationObserver = new MutationObserver(ms => {
            if(this.isAtBottom() || !this.jumping) return
            console.log('FILTER: mutatin precious')
            this.jumpToBottom()
        })
        this.mutationObserver.observe(this.chatComponent, {
            childList: true
        })

        this.initialMessageLoad()
        window['content'] = this.getContent()

        this.jumpToBottom()
    }  

    ngOnInit() {    
        // html will subscribe to this to get message additions/updates
        this.messagesForDisplay$ = App.emitCurrentContact$.pipe(
            take(1), 
            tap(c => this.contact = c), 
            concatMap(c => 
                App.emitMessages$(c.torAddress).pipe(map(ms => ms.sort(sortByTimestampDESC)))
            ),
            tap(messages => {
                const { updatedNewest } = this.updateRenderedMessageBoundary(
                    messages.filter(server)
                )
                
                if(this.isAtBottom()) { 
                    this.jumping = true 
                    return
                }

                this.jumping = false
                if(updatedNewest) {
                    this.$unreads$.next(true)
                }
            })
        )

        // Every time new messages are received, we update the oldest and newest message that's been loaded.
        // if we receive new inbound messages, and we're not at the bottom of the screen, then we have unreads
        this.subsToTeardown.push(
            this.messagesForDisplay$.subscribe(
                ms => Log.debug(`received new messages`, ms)
            )
        )
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

        nonBlockingLoader(
            this.stateIngestion.refreshMessages(c, options), 
            loader
        ).subscribe( ({contact, messages}) => {
            this.shouldGetAllOldMessages = messages.length >= config.loadMesageBatchSize
            this.$hasAllOldMessages$.next(!this.shouldGetAllOldMessages)
            Log.debug(`Loaded messages for ${contact.torAddress}`, messages, LogTopic.MESSAGES)
        })
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
        this.mutationObserver.disconnect()
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
        App.removeMessage$(contact, message).subscribe(b => {
            Log.info(`Message trackingId ${message.trackingId} removed: `, b, LogTopic.MESSAGES)
        })
    }

    send(contact: Contact, message: AttendingMessage) {
        App.alterContactMessages$({contact, messages: [message]}).pipe(tap(() => this.jumping = true)).subscribe()

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
        
        if(this.isAtBottom()) this.$unreads$.next(false)
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
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /* or $(window).height() */
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) /* or $(window).width() */
    )
}

function isOlder(a: { timestamp: Date }, b?: { timestamp: Date }) {
    return !b || new Date(a.timestamp) < new Date(b.timestamp)
}

function isNewer(a: { timestamp: Date }, b?: { timestamp: Date }) {
    return !b || new Date(a.timestamp) > new Date(b.timestamp)
}