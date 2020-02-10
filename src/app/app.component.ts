import { Component } from '@angular/core'

import { Platform, NavController } from '@ionic/angular'
import { SplashScreen } from '@ionic-native/splash-screen/ngx'
import { StatusBar } from '@ionic-native/status-bar/ngx'
import { CryoDaemon } from './services/daemons/cryo-daemon'
import { GlobalState } from './services/global-state'
import { CupsMessenger } from './services/cups/cups-messenger'
import { ContactWithMessageCount, Contact } from "./services/cups/types"
import { Observable } from 'rxjs'
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  public contacts$: Observable<ContactWithMessageCount[]>

  public makeNewContactForm = false
  public submittingNewContact = false
  public newContactTorAddress: string
  public newContactName: string
  public hamburger = false

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private cryo: CryoDaemon,
    private globe: GlobalState,
    private navCtrl: NavController,
    private cups: CupsMessenger
  ) {
    this.initializeApp()
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault()
      this.splashScreen.hide()
    })
    this.cryo.start()
  }

  jumpToChat(c: Contact) {
    this.globe.pokeCurrentContact(c)
    this.navCtrl.navigateRoot('contact-chat')
  }

  toggleNewContact() {
    this.makeNewContactForm = !this.makeNewContactForm
  }

  async submitNewContact() {
    this.submittingNewContact = true
    await this.cups.contactsAdd({
        torAddress: this.newContactTorAddress,
        name: this.newContactName
    })
    .handle(e => { console.error(e); this.submittingNewContact = false })
    .then(() => this.cryo.refresh())
    this.newContactTorAddress = undefined
    this.newContactName = undefined
    this.makeNewContactForm = false
    this.submittingNewContact = false
  }
}
