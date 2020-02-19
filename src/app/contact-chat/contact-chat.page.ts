import { Component, OnInit, ViewChild } from '@angular/core'
import { CupsMessenger } from '../services/cups/cups-messenger'
import { Contact, AttendingMessage, pauseFor, MessageBase } from '../services/cups/types'
import * as uuidv4 from 'uuid/v4'
import { NavController } from '@ionic/angular'
import { Observable, Subscription, BehaviorSubject, of } from 'rxjs'
import { prodContacts$, $prodSendMessage, $prodAddContact, prodContactMessages$ } from '../services/rx/paths'
import { globe } from '../services/global-state'
import { filter, take, map, delay } from 'rxjs/operators'

@Component({
  selector: 'app-contact-chat',
  templateUrl: './contact-chat.page.html',
  styleUrls: ['./contact-chat.page.scss'],
})
export class ContactChatPage implements OnInit {
  @ViewChild('content', { static: false }) private content: any

  currentContact$: Observable<Contact>
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

  constructor(
      private readonly navCtrl: NavController,
      private readonly cups: CupsMessenger,
  ) {
    globe.currentContact$.subscribe(c => {
      if(!c) return
      this.contactMessages$ = globe.watchMessages(c)
      this.currentContact$ = globe.currentContact$
      if(this.contactMessagesSub) { this.contactMessagesSub.unsubscribe() }

      this.contactMessagesSub = this.contactMessages$.pipe(delay(250)).subscribe( ms => {
        this.onMessageUpdate()
      })
      prodContactMessages$.next({})
    })
  }

  ngOnInit() {
    if (!globe.password) {
        this.navCtrl.navigateRoot('signin')
    }
    prodContacts$.next()
  }

  async onMessageUpdate(): Promise<void> {
    this.jumpIfAtBottom()
  }

  sendMessage(contact: Contact) {
    const messageText = this.messageToSend
    if (!contact) { return }

    const messageToAttend: AttendingMessage = {
      id: uuidv4(),
      timestamp: new Date(),
      direction: 'Outbound',
      otherParty: contact,
      text: this.messageToSend,
      attending: true
    }

    of(messageToAttend).subscribe(globe.observeAttendingMessage(contact))
    $prodSendMessage.next({contact, text: messageText})
    this.messageToSend = ''
  }

  contactNameForm(val: boolean) {
    this.error$.next(undefined)
    this.addContactNameForm = val
  }

  async updateContact(contact: Contact) {
    this.error$.next(undefined)
    this.updatingContact$.next(true)
    const updatedContact = {...contact, name: this.contactNameToAdd }

    try {
      globe.contacts$.pipe(
        filter(contacts => contacts.map(c => [c.name, c.torAddress]).indexOf( [contact.name, contact.torAddress] ) > 1),
        take(1)
      ).subscribe(() => {
        this.updatingContact$.next(false)
        this.addContactNameForm = false
        this.contactNameToAdd = undefined
      })
      $prodAddContact.next({contact: updatedContact })
    } catch (e) {
      this.error$.next(`Contact update failed: ${e.message}`)
      this.updatingContact$.next(false)
    }
  }

  private jumpIfAtBottom() {
    if (this.isAtBottom()) {
      this.jumpToBottom()
    }
  }

  private isAtBottom() {
    const targetElements = []
    targetElements[0] = document.getElementById('0')
    targetElements[1] = document.getElementById('1')
    targetElements[2] = document.getElementById('2')
    return targetElements.some( e => e && isElementInViewport(e))
  }

  toggleUnreads() {
      if (this.isAtBottom()) {
        this.unreads = false
      } else {
        this.unreads = true
      }
  }

  jumpToBottom() {
    this.content.scrollToBottom(300)
    this.unreads = false
  }
}

// returns true if the TOP of the element is in the view port.
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect()
    return rect.top < window.innerHeight && rect.bottom >= 0
}
