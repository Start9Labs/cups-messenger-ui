import { Component, OnInit, ViewChild } from '@angular/core'
import { Contact, AttendingMessage, MessageBase, pauseFor } from '../services/cups/types'
import * as uuidv4 from 'uuid/v4'
import { NavController } from '@ionic/angular'
import { Observable, Subscription, BehaviorSubject, of } from 'rxjs'
import { globe } from '../services/global-state'
import { delay } from 'rxjs/operators'
import { AppPaths } from '../services/rx/paths'

@Component({
  selector: 'app-contact-chat',
  templateUrl: './contact-chat.page.html',
  styleUrls: ['./contact-chat.page.scss'],
})
export class ContactChatPage implements OnInit {
  @ViewChild('content', { static: false }) private content: any

  currentContactTorAddress: string
  currentContact$: BehaviorSubject<Contact>
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
      private readonly paths: AppPaths,
  ) {
    globe.currentContact$.subscribe(c => {
      if(!c) return
      this.contactMessages$ = globe.watchMessages(c)
      this.currentContact$ = new BehaviorSubject(c)
      this.currentContactTorAddress = c.torAddress
      if(this.contactMessagesSub) { this.contactMessagesSub.unsubscribe() }

      this.contactMessagesSub = this.contactMessages$.pipe(delay(250)).subscribe( () => {
        this.onMessageUpdate()
      })

      this.paths.$showContactMessages$.next([uuidv4(), { contact: c }])
      pauseFor(125).then(() => this.jumpToBottom())
    })
  }

  ngOnInit() {
    if (!globe.password) {
        this.navCtrl.navigateRoot('signin')
    }
    this.paths.$showContacts$.next([uuidv4(), {}])
  }

  async onMessageUpdate(): Promise<void> {
    this.jumpIfAtBottom()
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
    }}).subscribe(globe.observeAttendingMessage)

    this.messageToSend = ''
    this.paths.$sendMessage$.next([uuidv4(), {contact, text: messageText}])
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
      const pid = uuidv4()
      this.paths.$showContacts$.subscribeToId(pid, cs => {
        const updated = cs.find(c => c.torAddress === this.currentContactTorAddress)
        this.updatingContact$.next(false)
        this.addContactNameForm = false
        this.contactNameToAdd = undefined
        this.currentContact$.next(updated)
      }, 10000)
      this.paths.$addContact$.next([pid, { contact: updatedContact }])
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
