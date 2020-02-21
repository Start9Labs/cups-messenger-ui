import { Component, OnInit, ViewChild, ElementRef } from '@angular/core'
import { Contact, MessageBase, pauseFor } from '../services/cups/types'
import * as uuidv4 from 'uuid/v4'
import { NavController } from '@ionic/angular'
import { Observable, Subscription, BehaviorSubject, of } from 'rxjs'
import { globe } from '../services/global-state'
import { tap } from 'rxjs/operators'
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

  contactMessagesSub: Subscription

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

  constructor(
      private readonly navCtrl: NavController,
      private readonly cups: CupsMessenger
  ) {
    globe.currentContact$.subscribe(c => {
      if(!c) return
      this.contactMessages$ = globe.watchMessages(c).pipe(tap(async (ms) => {
        await pauseFor(125)
        this.jumpToBottom()
        // if(this.isAtBottom()){
        //   await pauseFor(500)
        //   this.jumpToBottom()
        // } else {
        //   this.unreads = true
        // }
      }))

      this.currentContactTorAddress = c.torAddress

      if(this.contactMessagesSub) { this.contactMessagesSub.unsubscribe() }
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
    const messageText = this.messageToSend
    if (!contact) { return }

    of({contact, attendingMessage: {
      id: uuidv4(),
      timestamp: new Date(),
      direction: 'Outbound',
      otherParty: contact,
      text: this.messageToSend,
      attending: true
    }}).subscribe(s => {
      globe.observeAttendingMessage.next(s as any)
    })

    of(this.cups.messagesSend(contact, messageText)).subscribe({
      next: () => {
        prodMessageContacts$.next()
      },
      error: e => {
        console.error(e.message)
      }
    })
    this.messageToSend = ''
  }

  async jumpToBottom() {
    // this.unreads = false
    // this.content.scrollToBottom(200)
  }
}

// returns true if the TOP of the element is in the view port.
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect()
    return rect.top < window.innerHeight && rect.bottom >= 0
}
