import { Component, OnInit, ViewChild } from '@angular/core'
import { CupsMessenger } from '../services/cups/cups-messenger'
import { Contact, ServerMessage, AttendingMessage, DisplayMessage, serverMessageFulfills, pauseFor } from '../services/cups/types'
import * as uuidv4 from 'uuid/v4'
import { NavController } from '@ionic/angular'
import { Observable, Subscription, BehaviorSubject } from 'rxjs'
import { map } from 'rxjs/operators'
import { prodContacts$, $prodSendMessage } from '../services/rx/paths'
import { globe } from '../services/global-state'

@Component({
  selector: 'app-contact-chat',
  templateUrl: './contact-chat.page.html',
  styleUrls: ['./contact-chat.page.scss'],
})
export class ContactChatPage implements OnInit {
  @ViewChild('content', { static: false }) private content: any

  currentContact$: Observable<Contact>
  contactMessages$: Observable<DisplayMessage[]>
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
  ) { }

  ngOnInit() {
    if (!globe.password) {
        this.navCtrl.navigateRoot('signin')
    }

    prodContacts$.next()

    globe.watchCurrentContact().subscribe(c => this.onContactUpdate(c))
    this.currentContact$ = globe.watchCurrentContact()
  }

  async onContactUpdate(c: Contact | undefined): Promise<void> {
    if (!c) { return }
    this.contactMessages$ = globe.watchAllContactMessages(c).pipe(map(
      ms => { this.onMessageUpdate(ms); return ms }
    ))
    this.jumpToBottom()
  }

  async onMessageUpdate(ms: DisplayMessage[]): Promise<void> {
    this.jumpIfAtBottom()
  }

  getContact(): Contact | undefined {
    return globe.getCurrentContact()
  }

  sendMessage() {
    const contact = this.getContact()
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

    globe.pokeAppendAttendingMessage(contact, messageToAttend)

    $prodSendMessage.next({contact, text: messageText})
    this.messageToSend = ''
  }

  contactNameForm(val: boolean) {
    this.error$.next(undefined)
    this.addContactNameForm = val
  }

  async updateContact() {
    this.error$.next(undefined)
    this.updatingContact$.next(true)
    const contact = this.getContact()
    const updatedContact = {...contact, name: this.contactNameToAdd }

    try {
      await this.cups.contactsAdd(updatedContact).handle(e => {throw e})
      this.addContactNameForm = false
      this.contactNameToAdd = undefined
      globe.pokeCurrentContact(updatedContact)
      this.updatingContact$.next(false)
    } catch (e) {
      this.error$.next(`Contact update failed: ${e.message}`)
    } finally {
      this.updatingContact$.next(false)
    }
  }

  private jumpIfAtBottom() {
    if (this.isAtBottom()) {
      pauseFor(125).then(() => this.jumpToBottom())
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
