import { Component, OnInit, ViewChild } from '@angular/core'
import { Contact, MessageBase, pauseFor, AttendingMessage, FailedMessage, ServerMessage, isAttending } from '../services/cups/types'
import * as uuid from 'uuid'
import { NavController } from '@ionic/angular'
import { Observable, Subscription, BehaviorSubject, of, from } from 'rxjs'
import { globe } from '../services/global-state'
import { map, delay, switchMap, tap, filter, take, catchError } from 'rxjs/operators'
import { prodContactMessages$, prodContacts$, state } from '../services/rx/paths'
import { CupsMessenger } from '../services/cups/cups-messenger'
import { config } from '../config'

@Component({
  selector: 'app-contact-chat',
  templateUrl: './contact-chat.page.html',
  styleUrls: ['./contact-chat.page.scss'],
})
export class ContactChatPage implements OnInit {
    @ViewChild('content', { static: false }) private content: any

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
    globe = globe

    shouldJump = false
    jumpSub: Subscription
    mostRecentMessageTime: Date = new Date(0)
    oldestMessage: MessageBase
    canGetOlderMessages = false

    hasAllHistoricalMessages: { [tor: string]: true } = {}
    myTorAddress = config.myTorAddress

    constructor(
        private readonly navCtrl: NavController,
        private readonly cups: CupsMessenger
    ){
        globe.currentContact$.subscribe(c => {
            if(!c) return
            this.contactMessages$ = globe.watchMessages(c).pipe(map(ms => {
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
            prodContactMessages$.next({})
        })
    }

    ngOnInit() {
        if (!globe.password) {
            this.navCtrl.navigateRoot('signin')
        }
        prodContacts$.next()
        this.canGetOlderMessages = this.isAtTop()
    }

    // initialMessages(contact: Contact) {
    //     from(this.cups.newMessagesShow(contact)).pipe(state(
    //         newMs => {
    //             const sortedNewMs = (newMs || []).sort(sortByTimestamp)
    //             const showMessageParams = {} as ShowMessagesOptions
    //             if(sortedNewMs.length){
    //                 const oldest = sortedNewMs[0]
    //                 showMessageParams.offset = { id: oldest.id, direction: 'before' }
    //             }
    //             return from(this.cups.messagesShow(contact, showMessageParams))
    //         }),map( ([newMs, oldMs]) => {

    //         })
    //     ))
    // }

    sendMessage(contact: Contact) {
        const attendingMessage: AttendingMessage = {
            sentToServer: new Date(),
            direction: 'Outbound',
            otherParty: contact,
            text: this.messageToSend,
            trackingId: uuid.v4(),
        }
        this.send(contact, attendingMessage)
        this.messageToSend = ''
    }

    retry(contact: Contact, failedMessage: FailedMessage) {
        const retryMessage = {...failedMessage, sentToServer: new Date() }
        delete retryMessage.failure
        this.send(contact, retryMessage as AttendingMessage)
    }

    send(contact: Contact, message: AttendingMessage) {
        of({contact, messages: [message] }).subscribe(globe.$observeMessages)

        from(this.cups.messagesSend(contact, message.trackingId, message.text)).pipe(catchError(e => {
            console.error(`send message failure`, e.message)
            globe.$observeMessages.next( { contact, messages: [{...message, failure: e.message}] } )
            return of(undefined)
        })).subscribe({
            next: () => {
                prodContactMessages$.next({})
                of(message).pipe(delay(config.defaultServerTimeout)).subscribe(() => {
                    globe.$observeMessages.next( { contact, messages: [{...message, failure: 'timeout'}] } )
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
        globe.watchOldestServerMessage(contact).pipe(
            filter(m => !!m),
            tap(m => message = m),
            take(1),
            switchMap(m => from(this.cups.messagesShow(contact, { offset: { direction: 'before', id: m.id }} ))),
            map(ms => ({ contact, messages: ms }))
        ).subscribe( {
            next: res => {
                if(res.messages.length === 0) {
                    this.hasAllHistoricalMessages[contact.torAddress] = true
                }
                globe.$observeMessages.next(res)
                event.target.complete()
            },
            error: (e : Error) => {
                console.error(e.message)
                globe.$observeMessages.next( { contact, messages: [{...message, failure: e.message}] } )
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