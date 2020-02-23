import { Component, OnInit, ViewChild, ElementRef } from '@angular/core'
import { Contact, MessageBase, pauseFor, AttendingMessage, FailedMessage } from '../services/cups/types'
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

    isAtBottom(): boolean {
        const el = document.getElementById('end-of-scroll')
        return el ? isElementInViewport(el) : true
    }

    ngOnInit() {
        if (!globe.password) {
            this.navCtrl.navigateRoot('signin')
        }
        prodContacts$.next({})
    }

    sendMessage(contact: Contact) {
        const messageText = this.messageToSend
        if (!contact) { return }

        const attendingMessage: AttendingMessage = {
            sentToServer: new Date(),
            direction: 'Outbound',
            otherParty: contact,
            text: this.messageToSend,
            trackingId: uuidv4(),
        }

        of({contact, messages: [attendingMessage] }).subscribe(globe.$observeMessages)

        merge(
            from(this.cups.messagesSend(contact, messageText)).pipe(map(() => true)),
            interval(12000)                                   .pipe(map(() => false), take(1)) // TODO up to 12000
        )
        .subscribe({
            next: res => {
                if(!res) {
                    console.error(`message timed out ${attendingMessage.text}`)
                    globe.observeFailedMessage.next({contact, failedMessage: {...attendingMessage, failed: true}})
                }
                prodMessageContacts$.next()
            },
            error: e => {
                console.error(e.message)
                globe.observeFailedMessage.next({contact, failedMessage: {...attendingMessage, failed: true}})
            }
        })
        this.messageToSend = ''
        pauseFor(125).then(() => { this.unreads = false; this.jumpToBottom() })
    }

    async jumpToBottom() {
        if(this.content) { this.content.scrollToBottom(200) }
    }

    onScrollEnd(){
        if(this.isAtBottom()){
        this.unreads = false
        }
    }

    ngOnDestroy(): void {
        return this.jumpSub && this.jumpSub.unsubscribe()
    }

    delete(contact: Contact, failedMessage : FailedMessage): void {
        globe.observeDeleteMessage.next({contact, failedMessage})
    }
}

// returns true if the TOP of the element is in the view port.
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect()
    return rect.top < window.innerHeight && rect.bottom >= 0
}