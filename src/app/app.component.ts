import { Component } from '@angular/core'

import { Platform, NavController } from '@ionic/angular'
import { SplashScreen } from '@ionic-native/splash-screen/ngx'
import { StatusBar } from '@ionic-native/status-bar/ngx'
import { Cryodaemon } from './services/cryo-daemon'
import { GlobalState } from './services/global-state'
import { ContactWithMessageCount, Contact } from './services/cups-messenger'
import { Observable } from 'rxjs'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  public contacts$: Observable<ContactWithMessageCount[]>

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private cryo: Cryodaemon,
    private globe: GlobalState,
    private navCtrl: NavController
  ) {
    this.initializeApp()
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault()
      this.splashScreen.hide()
      this.contacts$ = this.cryo.watch()
    })
  }

  jumpToChat(c: Contact){
    this.globe.pokeContact(c)
    this.navCtrl.navigateRoot('contact-chat')
  }
}
