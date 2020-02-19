import { Component } from '@angular/core'

import { Platform, NavController } from '@ionic/angular'
import { globe } from './services/global-state'
import { CupsMessenger } from './services/cups/cups-messenger'
import { ContactWithMessageCount, Contact } from './services/cups/types'
import { Observable, BehaviorSubject, interval, merge } from 'rxjs'
import { main, $prodAddContact, addContactFire } from './services/rx/paths'
import { onionToPubkeyString } from './services/cups/cups-res-parser'
import * as uuidv4 from 'uuid/v4'
import { filter, take } from 'rxjs/operators'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  public contacts$: Observable<ContactWithMessageCount[]>
  public makeNewContactForm = false
  public submittingNewContact$ = new BehaviorSubject(false)
  public newContactTorAddress: string
  public newContactName: string

  public loading$ = new BehaviorSubject(false)
  public error$ = new BehaviorSubject(undefined)
  public globe = globe

  constructor(
    private platform: Platform,
    private navCtrl: NavController,
    private cups: CupsMessenger
  ) {
    this.initializeApp()
  }

  initializeApp() {
    main(this.cups)
    this.platform.ready().then(() => {})
  }

  jumpToChat(c: Contact) {
    globe.currentContact$.next(c)
    this.navCtrl.navigateRoot('contact-chat')
  }

  toggleNewContact() {
    this.makeNewContactForm = !this.makeNewContactForm
    this.error$.next(undefined)
  }

  async submitNewContact() {
    this.error$.next(undefined)
    const sanitizedTorOnion = this.newContactTorAddress.trim().split('.onion')[0].concat('.onion')

    try {
      onionToPubkeyString(sanitizedTorOnion)
    } catch (e) {
      this.error$.next(`Invalid V3 Tor Address: ${e.message}`)
      return
    }

    const sanitizedName = this.newContactName.trim()
    if (sanitizedName.length > 255) {
      this.error$.next(`Name must be less than 255 characters.`)
      return
    }

    this.submittingNewContact$.next(true)

    try {
      const contact = {
        torAddress: sanitizedTorOnion,
        name: sanitizedName
      }

      globe.contacts$.pipe(
        filter(contacts => contacts.map(c => c.torAddress).indexOf( contact.torAddress ) > 1),
        take(1)
      ).subscribe(() => {
        this.submittingNewContact$.next(false)
        this.newContactTorAddress = undefined
        this.newContactName = undefined
        this.makeNewContactForm = false
      })
      $prodAddContact.next({contact})

    } catch (e) {
      this.error$.next(e.message)
    }
  }
}
