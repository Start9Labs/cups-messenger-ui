import { Component, OnInit, ViewChild, ElementRef } from '@angular/core'
import { Contact, MessageBase, pauseFor } from '../services/cups/types'
import * as uuidv4 from 'uuid/v4'
import { NavController } from '@ionic/angular'
import { Observable, Subscription, BehaviorSubject, of } from 'rxjs'
import { globe } from '../services/global-state'
import { AppPaths } from '../services/rx/paths'
import { tap } from 'rxjs/operators'

@Component({
  selector: 'app-contact-chat',
  templateUrl: './contact-chat.page.html',
  styleUrls: ['./contact-chat.page.scss'],
})
export class ContactChatPage implements OnInit {
  @ViewChild('content', { static: false }) private content: any
  @ViewChild('chat', {read: ElementRef}) chatList: ElementRef

  currentContactTorAddress: string
  currentContact$: BehaviorSubject<Contact> = new BehaviorSubject(undefined)
  contactMessages$: Observable<MessageBase[]> = new Observable()

  contactMessagesSub: Subscription
  shouldJumpToBottom = true

  mutationObserver: MutationObserver

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
      private readonly paths: AppPaths,
  ) {
    globe.currentContact$.subscribe(c => {
      if(!c) return
      this.jumpToBottom()
      this.contactMessages$ = globe.watchMessages(c).pipe(tap( () => {
        if(this.isAtBottom()){
          this.shouldJumpToBottom = true
        }
      }))
      this.currentContactTorAddress = c.torAddress
      this.initMutationObserver()

      if(this.contactMessagesSub) { this.contactMessagesSub.unsubscribe() }
      this.paths.$showContactMessages$.next([uuidv4(), { contact: c }])
    })
  }

  ngOnInit() {
    if (!globe.password) {
        this.navCtrl.navigateRoot('signin')
    }
    this.paths.$showContacts$.next([uuidv4(), {}])
  }

  initMutationObserver(){
    if(this.mutationObserver){
      return
    }

    this.mutationObserver = new MutationObserver((mutations) => {
      if(this.shouldJumpToBottom){
        this.shouldJumpToBottom = false
        this.jumpToBottom()
      } else {
        this.unreads = true
      }
    })
    this.mutationObserver.observe(this.chatList.nativeElement, {
        childList: true
    })
  }

  ionViewWillEnter(){
    if(!this.isAtBottom()){
      this.unreads = true
    }
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

    this.messageToSend = ''
    this.paths.$sendMessage$.next([uuidv4(), {contact, text: messageText}])
  }

  private isAtBottom() {
    const targetElements = []
    targetElements[0] = document.getElementById('0')
    targetElements[1] = document.getElementById('1')
    return targetElements.some( e => e && isElementInViewport(e))
  }

  async jumpToBottom() {
    this.unreads = false
    this.content.scrollToBottom(200)
  }
}

// returns true if the TOP of the element is in the view port.
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect()
    return rect.top < window.innerHeight && rect.bottom >= 0
}
