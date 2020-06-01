import { Component, OnInit, ViewChild, NgZone } from '@angular/core'
import { Contact, Message, AttendingMessage, FailedMessage, ServerMessage, server, mkAttending, mkFailed, failed, attending } from '../../services/cups/types'
import * as uuid from 'uuid'
import { NavController, LoadingController, IonInfiniteScroll } from '@ionic/angular'
import { Observable, of, combineLatest, Subscription, BehaviorSubject, timer, Subject } from 'rxjs'
import { switchMap, tap, filter, catchError, concatMap, take, delay, distinctUntilChanged, map } from 'rxjs/operators'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { config, LogTopic } from '../../config'
import { App } from '../../services/state/app-state'
import { StateIngestionService } from '../../services/state/state-ingestion/state-ingestion.service'
import { Log } from '../../log'
import { exists, nonBlockingLoader, both } from 'src/rxjs/util'
import { ShowMessagesOptions } from 'src/app/services/cups/live-messenger'
import { sortByTimestampDESC } from 'src/app/util'
// import * as s from '@svgdotjs/svg.js'
// const SVG = s.SVG
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
    contact: Contact


    $newMessagesLoading$ = new BehaviorSubject(false)
    $previousMessagesLoading$ = new BehaviorSubject(false)
    @ViewChild('infiniteScroll', {read: IonInfiniteScroll }) public infiniteScroll:IonInfiniteScroll

    // Messages w current status piped from app-state sorted by timestamp
    messagesForDisplay$: Observable<Message[]>

    // Used to determine whether we should present jump button
    private $atBottom$ = new BehaviorSubject(true)
    atBottom$ = this.$atBottom$.asObservable().pipe(distinctUntilChanged()) // only notify subs if things have changed

    // Used for green highlights
    private $unreads$ = new BehaviorSubject(false)
    unreads$ = this.$unreads$.asObservable().pipe(distinctUntilChanged()) // only notify subs if things have changed

    // Synced to text entry field in UI
    messageToSend: string

    
    newestRendered: ServerMessage | undefined = undefined // newest rendered should be used to jump to last viewed in future iterations
    oldestRendered: ServerMessage | undefined = undefined // oldest rendered is used for fetching older messages


    myTorAddress = config.myTorAddress

    // These will be unsubbed on ngOnDestroy
    private ngOnInitSubs: Subscription[] = []

    constructor(
        private readonly nav: NavController,
        private readonly zone: NgZone,
        private readonly cups: CupsMessenger,
        private readonly stateIngestion: StateIngestionService,
    ){
    }

    ngAfterViewInit() {
        // load messages right away so we don't have to wait for daemon
        this.infiniteScroll.disabled = true
        this.initialMessageLoad()
    }  

    ngOnInit() {    
        // html will subscribe to this to get message additions/updates
        this.messagesForDisplay$ = App.emitCurrentContact$.pipe(
            take(1), concatMap(c => App.emitMessages$(c.torAddress).pipe(map(ms => ms.sort(sortByTimestampDESC))))
        )


        // Every time new messages are received, we update the oldest and newest message that's been loaded.
        // if we receive new inbound messages, and we're not at the bottom of the screen, then we have unreads
        this.ngOnInitSubs.push(this.messagesForDisplay$.subscribe(
            messages => {
                // initializes the metadata object if it's not already there
                if(isAtBottom()){ this.jumpToBottom() }
                debugger
                const { updatedNewest } = this.updateRenderedMessageBoundary(
                    messages.filter(server)
                )

                if(updatedNewest) { // if we updated the newest message, mark unread if we're not at the bottom
                    this.$unreads$.next(!isAtBottom())
                }
            }
        ))
    }

    initialMessageLoad(){
        App.emitCurrentContact$.pipe(take(1), concatMap(c => {
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
                this.stateIngestion.refreshMessages(c, options).pipe(delay(200), tap(() => this.jumpToBottom(100))), 
                loader
            )
        })).subscribe( ({contact, messages}) => {
            this.infiniteScroll.disabled = messages.length < config.loadMesageBatchSize
            this.jumpToBottom(100)
            Log.debug(`Loaded messages for ${contact.torAddress}`, messages, LogTopic.MESSAGES)
        })
    }
    
    // Triggered by enabled infinite scroll
    oldMessageLoad(event: any, contact: Contact) {
        if(this.oldestRendered){
            debugger
            this.stateIngestion.refreshMessages(
                contact, { limit: config.loadMesageBatchSize, offset: { direction: 'before', id: this.oldestRendered.id }}
            ).subscribe({
                next: ({ messages }) => {
                    this.infiniteScroll.disabled = messages.length < config.loadMesageBatchSize
                    event.target.complete()
                },
                error: e => {
                    Log.error('Exception fetching older messages for ' + contact.torAddress, e, LogTopic.MESSAGES)
                    event.target.complete()
                }
            })
        } else {
            event.target.complete()
        }
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
        if(this.content) {
            this.content.scrollToBottom(timeToScroll)
            this.$atBottom$.next(true)
            this.$unreads$.next(false)
        }
    }

    // TODO: this needs to find the lastviewed element and jump there. Presently we just jump to the bottom, which is fine.
    async jumpToLastViewed() {
        this.jumpToBottom()
    }

    onScrollEnd(){
        const bottom = isAtBottom()
        this.$atBottom$.next(bottom)
        if(bottom) this.$unreads$.next(false)
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