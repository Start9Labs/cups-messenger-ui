import { Component } from '@angular/core'

import { globe } from './services/global-state'
import { NavController, MenuController } from '@ionic/angular'
import { ContactWithMessageCount, Contact } from './services/cups/types'
import { Observable, BehaviorSubject } from 'rxjs'
import { AppPaths } from './services/rx/paths'
import { onionToPubkeyString } from './services/cups/cups-res-parser'
import * as uuidv4 from 'uuid/v4'

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
    private readonly paths: AppPaths,
    private readonly navCtrl: NavController,
    private menu: MenuController,
  ) {
  }

  jumpToChat(c: Contact) {
    globe.currentContact$.next(c)
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
      const contact = {
        torAddress: sanitizedTorOnion,
        name: sanitizedName
      }

      const pid = uuidv4()
      this.paths.$showContacts$.subscribeToId(pid, () => {
        this.submittingNewContact$.next(false)
        this.newContactTorAddress = undefined
        this.newContactName = undefined
        this.makeNewContactForm = false
      }, 10000)
      this.paths.$addContact$.next([pid, { contact }])

    } catch (e) {
      this.error$.next(e.message)
    }
  }
}
