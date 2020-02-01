import { Component, OnInit, ViewChild } from '@angular/core'
import { GlobalState } from '../services/global-state'
import { CupsMessenger, Message, Contact } from '../services/cups-messenger'
import { BehaviorSubject, Observable } from 'rxjs'
import { Pyrodaemon, Cryodaemon } from '../services/cryo-daemon'
import { first, map } from 'rxjs/operators'

@Component({
  selector: 'app-contact-chat',
  templateUrl: './contact-chat.page.html',
  styleUrls: ['./contact-chat.page.scss'],
})
export class ContactChatPage implements OnInit {
  @ViewChild('content', { static: false }) private content: any

  mostRecentInboundMessage: Message | undefined
  unreads = false

  messageToSend: string
  messagesToShow: Message[]

  contact$: BehaviorSubject<Contact | undefined>
  contactMessages$: Observable<Message[]>
  private pyro: Pyrodaemon

  constructor(private readonly globe: GlobalState, private readonly cups: CupsMessenger, private readonly cryo: Cryodaemon) { }


  ngOnInit() {
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
            () => { this.pyro.refresh(); this.content.scrollToBottom(300) }
        )
        this.messageToSend = ''
    }

  async onContactUpdate(c: Contact | undefined): Promise<void> {
    if (c) {
        await this.initPyro(c)
        this.content.scrollToBottom(300)
        this.pyro.start()
    }
  }

  private async initPyro(c: Contact) {
    if (this.pyro) { this.pyro.stop() }
    this.pyro = new Pyrodaemon(this.cups, c)
    this.contactMessages$ = this.pyro.watch().pipe(map(ms => ms.sort(orderTimestampDescending)))
    await this.pyro.refresh()
    this.contactMessages$.subscribe(ms => this.adjustViewPort(ms))
  }

  private adjustViewPort(ms: Message[]) {
    const mostRecentInbound = ms.filter(m => m.direction === 'Inbound')[0]
    const isNewMessage = !this.mostRecentInboundMessage || mostRecentInbound.timestamp > this.mostRecentInboundMessage.timestamp
    if (isNewMessage) {
        if (this.mostRecentInboundMessage) {
            const mostRecentInboundElement = document.getElementById(this.mostRecentInboundMessage.id)
            if (isElementInViewport(mostRecentInboundElement)) {
                this.content.scrollToBottom(300)
            } else {
                this.unreads = true
            }
        }
        this.mostRecentInboundMessage = mostRecentInbound
    }
  }

  checkIfAtBottom() {
      console.log('CHECLING')
      if (this.mostRecentInboundMessage) {
          console.log('MadeIT')
        const mostRecentInboundElement = document.getElementById(this.mostRecentInboundMessage.id)
        if (isElementInViewport(mostRecentInboundElement)) {
            console.log('MadeIT2')
            this.unreads = false
         }
    }
  }

  jumpToUnread() {
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
