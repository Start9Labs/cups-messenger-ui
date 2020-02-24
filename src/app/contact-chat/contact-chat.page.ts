import { Component, OnInit, ViewChild } from '@angular/core'
import { Contact, MessageBase, pauseFor, AttendingMessage, FailedMessage, isFailed, isServer, isAttending } from '../services/cups/types'
import * as uuidv4 from 'uuid/v4'
import { NavController } from '@ionic/angular'
import { Observable, Subscription, BehaviorSubject, of, merge, interval, from } from 'rxjs'
import { globe } from '../services/global-state'
import { tap, map, take, delay } from 'rxjs/operators'
import { prodMessageContacts$, prodContacts$ } from '../services/rx/paths'
import { CupsMessenger } from '../services/cups/cups-messenger'

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
    mostRecentMessage: Date = new Date(0)

    constructor(
        private readonly navCtrl: NavController,
        private readonly cups: CupsMessenger
    ){
        globe.currentContact$.subscribe(c => {
            if(!c) return
            this.contactMessages$ = globe.watchMessages(c).pipe(tap(() => {
                this.shouldJump = this.isAtBottom()
                if(this.shouldJump) { this.unreads = false }
            }))

            if(this.jumpSub) { this.jumpSub.unsubscribe() }

            this.jumpSub = this.contactMessages$.pipe(delay(150)).subscribe(ms => {
                const mostRecent = ms[0]
                if(this.shouldJump){
                    this.unreads = false
                    this.jumpToBottom()
                    this.shouldJump = false
                } else if (mostRecent && mostRecent.timestamp && mostRecent.timestamp > this.mostRecentMessage) {
                    this.unreads = true
                }
                this.mostRecentMessage = (mostRecent && mostRecent.timestamp) || this.mostRecentMessage
            })

            this.currentContactTorAddress = c.torAddress
            prodMessageContacts$.next({})
        })
    }

    ngOnInit() {
        if (!globe.password) {
            this.navCtrl.navigateRoot('signin')
        }
        prodContacts$.next({})
    }

    sendMessage(contact: Contact) {
        const attendingMessage: AttendingMessage = {
            sentToServer: new Date(),
            direction: 'Outbound',
            otherParty: contact,
            text: this.messageToSend,
            trackingId: uuidv4(),
        }

        this.send(contact, attendingMessage)
        this.messageToSend = ''
    }

    retry(contact: Contact, failedMessage: FailedMessage) {
        const retryMessage = Object.assign(failedMessage, { sentToServer: new Date(), failure: undefined })
        this.send(contact, retryMessage as AttendingMessage)
    }

    send(contact: Contact, message: AttendingMessage) {
        of({contact, messages: [message] }).subscribe(globe.$observeMessages)

        merge(
            from(this.cups.messagesSend(contact, message.text)).pipe(
                map(() =>  true)),
            interval(4000).pipe(take(1),
                map(() => false)) // TODO up to 12000
        ).subscribe({
            next: res => {
                if(!res) {
                    console.error(`message timed out ${message.text}`)
                    globe.$observeMessages.next( { contact, messages: [{...message, failure: 'timed out'}] } )
                }
                prodMessageContacts$.next()
            },
            error: e => {
                console.error(e.message)
                globe.$observeMessages.next( { contact, messages: [{...message, failure: e.message}] } )
            }
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
        if(this.isAtTop()) {
            
        }
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