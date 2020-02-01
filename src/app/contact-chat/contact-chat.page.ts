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

  onContactUpdate(c: Contact | undefined): void {
    if (c) {
        if (this.pyro) { this.pyro.stop() }
        this.pyro = new Pyrodaemon(this.cups, c)
        this.contactMessages$ = this.pyro.watch().pipe(map( ms => ms.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())))
        this.contactMessages$.subscribe(ms => {
            this.scrollToBottomOnInit()
        })

        this.pyro.refresh().then(() => { this.pyro.start(); this.content.scrollToBottom(300)})
    }
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

  private scrollToBottomOnInit() {
    this.content.scrollToBottom(300)
  }
}

function toShowMessage(m: Message): Message & {reference: string} {
    return Object.assign(m, { reference: m.otherParty.name || m.otherParty.torAddress })
}
