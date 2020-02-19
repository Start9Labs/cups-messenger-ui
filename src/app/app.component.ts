import { Component } from '@angular/core'

import { Platform, NavController, MenuController } from '@ionic/angular'
import { CryoDaemon } from './services/daemons/cryo-daemon'
import { GlobalState } from './services/global-state'
import { CupsMessenger } from './services/cups/cups-messenger'
import { ContactWithMessageCount, Contact, pauseFor } from './services/cups/types'
import { Observable, BehaviorSubject } from 'rxjs'
import { onionToPubkeyString } from './services/cups/cups-res-parser'
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


  constructor(
    private platform: Platform,
    private cryo: CryoDaemon,
    public globe: GlobalState,
    private navCtrl: NavController,
    private cups: CupsMessenger,
    private menu: MenuController,
  ) {
    this.initializeApp()
  }

  initializeApp() {
    this.platform.ready().then(() => {
    })
    this.cryo.start()
  }

  jumpToChat(c: Contact) {
    this.globe.pokeCurrentContact(c)
    this.navCtrl.navigateRoot('contact-chat')
    this.menu.close('main-menu')
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
      await this.cups.contactsAdd({
        torAddress: sanitizedTorOnion,
        name: sanitizedName
      }).handle(e => {throw e})
      this.newContactTorAddress = undefined
      this.newContactName = undefined
      this.makeNewContactForm = false
    } catch (e) {
      this.error$.next(e.message)
    } finally {
      this.submittingNewContact$.next(false)
    }
  }
}
