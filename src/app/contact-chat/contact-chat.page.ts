import { Component, OnInit, ViewChild } from '@angular/core'
import { GlobalState, CategorizedMessages } from '../services/global-state'
import { CupsMessenger } from '../services/cups/cups-messenger'
import { Contact, ServerMessage, AttendingMessage, DisplayMessage, serverMessageFulfills, pauseFor } from '../services/cups/types'
import { CryoDaemon } from '../services/daemons/cryo-daemon'
import { PyroDaemon } from '../services/daemons/pyro-daemon'
import * as uuidv4 from 'uuid/v4'
import { NavController } from '@ionic/angular'
import { Observable, Subscription, BehaviorSubject, Subject } from 'rxjs'
import { map, mergeMap, tap } from 'rxjs/operators'

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
  updatingContact$ = new BehaviorSubject(false)
  error$: BehaviorSubject<string> = new BehaviorSubject(undefined)
  sendMessage$: Subject<[Contact, string]> = new Subject()

  constructor(
      private readonly navCtrl: NavController,
      private readonly globe: GlobalState,
      private readonly cups: CupsMessenger,
      private readonly cryo: CryoDaemon
  ) { }

  ngOnInit() {
    if (!this.globe.password) {
        this.navCtrl.navigateRoot('signin')
    }
    this.cryo.refresh()
    this.globe.watchCurrentContact().subscribe(c => this.onContactUpdate(c))
    this.currentContact$ = this.globe.watchCurrentContact()
    this.sendMessage$
      .pipe(
        mergeMap( ([contact, message]) => this.cups.messagesSend(contact, message))
      )
      .subscribe( () => { 
        this.pyro.refresh()
        console.log(`Message sent.`)
      })
  }

  async onContactUpdate(c: Contact | undefined): Promise<void> {
    if (!c) { return }
    await this.restartPyro()
    this.contactMessages$ = this.globe.watchAllContactMessages(c).pipe(mergeMap(
      async (ms : DisplayMessage[]) => await this.jumpIfAtBottom().then(() => ms)
    ))
    this.pyro.start()
  }

  getContact(): Contact | undefined {
    return this.globe.getCurrentContact()
  }

  sendMessage() {
    const contact = this.getContact()
    if (!contact) { return }

    const messageText = this.messageToSend
    const messageToAttend: AttendingMessage = {
      id: uuidv4(),
      timestamp: new Date(),
      direction: 'Outbound',
      otherParty: contact,
      text: messageText,
      attending: true
    }

    this.messageToSend = ''
    this.globe.pokeAppendAttendingMessage(contact, messageToAttend)
    this.sendMessage$.next([contact, messageText])
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
      this.globe.pokeCurrentContact(updatedContact)
      this.updatingContact$.next(false)
    } catch (e) {
      this.error$.next(`Contact update failed: ${e.message}`)
    } finally {
      this.updatingContact$.next(false)
    }
  }

  private async restartPyro() {
    if (this.pyro) { this.pyro.stop() }
    this.pyro = new PyroDaemon(this.globe, this.cups)
    await this.pyro.refresh()
  }

  private async jumpIfAtBottom() {
    if (this.isAtBottom()) {
      await this.jumpToBottom()
    }
  }

  private isAtBottom() {
    const targetElements = []
    targetElements[0] = document.getElementById('0')
    return targetElements.some( e => e && isElementInViewport(e))
  }

  toggleUnreads() {
      if (this.isAtBottom()) {
        this.unreads = false
      } else {
        this.unreads = true
      }
      this.unreads = false
  }

  async jumpToBottom() {
    await this.content.scrollToBottom(300)
    this.unreads = false
  }
}

// returns true if the TOP of the element is in the view port.
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect()
    return rect.top < window.innerHeight && rect.bottom >= 0
}
