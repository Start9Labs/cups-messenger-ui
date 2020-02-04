import { Component } from '@angular/core'

import { Platform, NavController } from '@ionic/angular'
import { SplashScreen } from '@ionic-native/splash-screen/ngx'
import { StatusBar } from '@ionic-native/status-bar/ngx'
import { Cryodaemon } from './services/cryo-daemon'
import { GlobalState } from './services/global-state'
import { ContactWithMessageCount, Contact, CupsMessenger } from './services/cups-messenger'
import { Observable, BehaviorSubject } from 'rxjs'
import { map } from 'rxjs/operators'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  public contacts$: Observable<ContactWithMessageCount[]>

  public makeNewContactForm = false
  public newContactTorAddress: string
  public newContactName: string

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private cryo: Cryodaemon,
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
      this.contacts$ = this.cryo.watch().pipe(map(cs => cs.sort((c1, c2) => c2.unreadMessages - c1.unreadMessages)))
    })
  }

  jumpToChat(c: Contact) {
    this.globe.pokeContact(c)
    this.navCtrl.navigateRoot('contact-chat')
  }

  toggleNewContact() {
    this.makeNewContactForm = !this.makeNewContactForm
  }

  async submitNewContact() {
      try {
        await this.cups.contactsAdd({
            torAddress: this.newContactTorAddress,
            name: this.newContactName
        })
        await this.cryo.refresh()
        this.newContactTorAddress = undefined
        this.newContactName = undefined
        this.makeNewContactForm = false
      } catch (e) {

      }
  }
}
