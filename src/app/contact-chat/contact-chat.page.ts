import { Component, OnInit, ViewChild } from '@angular/core'
import { GlobalState, CategorizedMessages, globe } from '../services/global-state'
import { CupsMessenger } from '../services/cups/cups-messenger'
import { Contact, ServerMessage, AttendingMessage, DisplayMessage, serverMessageFulfills, pauseFor } from '../services/cups/types'
import { CryoDaemon } from '../services/rx/cryo-daemon'
import { PyroDaemon } from '../services/rx/pyro-daemon'
import * as uuidv4 from 'uuid/v4'
import { NavController } from '@ionic/angular'
import { Observable, Subscription } from 'rxjs'
import { map } from 'rxjs/operators'

@Component({
  selector: 'app-contact-chat',
  templateUrl: './contact-chat.page.html',
  styleUrls: ['./contact-chat.page.scss'],
})
export class ContactChatPage implements OnInit {
  @ViewChild('content', { static: false }) private content: any

  private pyro: PyroDaemon

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
  updatingContact = false

  constructor(
      private readonly navCtrl: NavController,
      private readonly cups: CupsMessenger,
      private readonly cryo: CryoDaemon
  ) { }

  ngOnInit() {
    if (!globe.password) {
        this.navCtrl.navigateRoot('signin')
    }
    this.cryo.refresh()
    globe.watchCurrentContact().subscribe(c => this.onContactUpdate(c))
    this.currentContact$ = globe.watchCurrentContact()
  }

  async onContactUpdate(c: Contact | undefined): Promise<void> {
    if (!c) { return }
    await this.restartPyro()
    this.contactMessages$ = globe.watchAllContactMessages(c).pipe(map(
      ms => { this.onMessageUpdate(ms); return ms }
    ))
    this.jumpToBottom()
    this.pyro.start()
  }

  async onMessageUpdate(ms: DisplayMessage[]): Promise<void> {
    this.jumpIfAtBottom()
  }

  getContact(): Contact | undefined {
    return globe.getCurrentContact()
  }

  sendMessage() {
    if (!this.getContact()) { return }
    const messageToAttend: AttendingMessage = {
      id: uuidv4(),
      timestamp: new Date(),
      direction: 'Outbound',
      otherParty: this.getContact(),
      text: this.messageToSend,
      attending: true
    }

    globe.pokeAppendAttendingMessage(this.getContact(), messageToAttend)
    this.cups.messagesSend(this.getContact(), this.messageToSend).then(
      () => {
        globe.logState('cups-message-send complete: ', this.getContact())
        this.pyro.refresh()
      }
    )
    this.jumpToBottom()
    this.messageToSend = ''
  }

  contactNameForm(val: boolean) {
    this.addContactNameForm = val
  }

  async updateContact() {
    this.updatingContact = true
    const contact = this.getContact()
    const updatedContact = {...contact, name: this.contactNameToAdd }

    await this.cups.contactsAdd(updatedContact).handle(
      e => { console.error(e) ; this.updatingContact = false }
    )

    this.addContactNameForm = false
    this.contactNameToAdd = undefined
    globe.pokeCurrentContact(updatedContact)
    this.updatingContact = false
  }

  private async restartPyro() {
    if (this.pyro) { this.pyro.stop() }
    this.pyro = new PyroDaemon(this.cups)
    await this.pyro.refresh()
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
