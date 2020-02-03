import { Component, OnInit, ViewChild } from '@angular/core'
import { GlobalState } from '../services/global-state'
import { CupsMessenger, Message, Contact } from '../services/cups-messenger'
import { BehaviorSubject, Observable } from 'rxjs'
import { Pyrodaemon, Cryodaemon } from '../services/cryo-daemon'
import { map, tap } from 'rxjs/operators'
import { NavController } from '@ionic/angular'

@Component({
  selector: 'app-contact-chat',
  templateUrl: './contact-chat.page.html',
  styleUrls: ['./contact-chat.page.scss'],
})
export class ContactChatPage implements OnInit {
  @ViewChild('content', { static: false }) private content: any

  mostRecentMessage: Message | undefined
  unreads = false

  messageToSend: string
  messagesToShow: Message[]

  editingContactForm = false
  newContactTorAddress: string
  newContactName: string

  contact$: BehaviorSubject<Contact | undefined>
  displayName: string
  contactMessages$: Observable<Message[]>
  private pyro: Pyrodaemon

  constructor(
      private readonly navCtrl: NavController,
      private readonly globe: GlobalState,
      private readonly cups: CupsMessenger,
      private readonly cryo: Cryodaemon
  ) { }

  ngOnInit() {
    if(!this.globe.password){
        this.navCtrl.navigateRoot('signin')
    }
    this.cryo.refresh().then(() => this.cryo.start())
    this.contact$ = this.globe.watchContact()
    this.contact$.subscribe(c => this.onContactUpdate(c))
  }

    getContact(): Contact | undefined {
        return this.contact$.getValue()
    }

    sendMessage() {
        if (!this.getContact()) { return }
        this.cups.messagesSend(this.getContact(), this.messageToSend).then(
            () => { this.pyro.refresh(); this.jumpToBottom() }
        )
        this.messageToSend = ''
    }

  async onContactUpdate(c: Contact | undefined): Promise<void> {
    if (c) {
        this.newContactName = c.name
        this.newContactTorAddress = c.torAddress

        const n = c.name || c.torAddress
        this.displayName = n.length > 50 ? n.slice(0, 25) + '...' + n.slice(-25) : n
        this.cryo.start()
        await this.initPyro(c)
        this.jumpToBottom()
        this.pyro.start()
    }
  }

  private async initPyro(c: Contact) {
    if (this.pyro) { this.pyro.stop() }
    this.pyro = new Pyrodaemon(this.cups, c)
    this.contactMessages$ = this.pyro.watch().pipe(map(ms => ms.sort(orderTimestampDescending)))
    await this.pyro.refresh()
    this.contactMessages$.subscribe(ms => this.jumpOrDisplayJumpButton(ms))
  }

  private jumpOrDisplayJumpButton(ms: Message[]) {
    const mostRecentMessage = ms[0]
    if (mostRecentMessage) {
        const isNewMessage = !this.mostRecentMessage || mostRecentMessage.timestamp > this.mostRecentMessage.timestamp
        if (isNewMessage) {
            if (this.mostRecentMessage) {
                const mostRecentElement = document.getElementById(this.mostRecentMessage.id)
                if (isElementInViewport(mostRecentElement)) {
                    this.jumpToBottom()
                } else {
                    this.unreads = true
                }
            }
            this.mostRecentMessage = mostRecentMessage
        }
    }
  }

  checkIfAtBottom() {
      if (this.mostRecentMessage) {
          const mostRecentInboundElement = document.getElementById(this.mostRecentMessage.id)
          if (isElementInViewport(mostRecentInboundElement)) {
            this.unreads = false
         }
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
    // elemTop < window.innerHeight && elemBottom >= 0;
    return (
        rect.top < window.innerHeight &&
        rect.bottom >= 0
    )
}

const orderTimestampDescending = (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
