import { Component, OnInit } from '@angular/core'

import { NavController } from '@ionic/angular'
import { GlobalState } from '../services/global-state'
import { CryoDaemon } from '../services/daemons/cryo-daemon'
import { CupsMessenger } from '../services/cups/cups-messenger'

@Component({
  selector: 'app-signin',
  templateUrl: './signin.page.html',
  styleUrls: ['./signin.page.scss'],
})
export class SigninPage implements OnInit {
  password = ''

  constructor(
    private readonly cups: CupsMessenger,
    private readonly globe: GlobalState,
    private readonly navCtrl: NavController,
  ) { }

  ngOnInit() {
      this.globe.init().then(() => this.signin())
  }

  enterCupsMessengerPassword() {
    this.globe.setPassword(this.password).then(async () => {
      try {
        await this.cups.contactsShow()
        await this.signin()
      } catch (e) {
        console.error(e)
        await this.globe.clearPassword()
      }
    })
  }

  private signin() {
    if (this.globe.password) {
        this.navCtrl.navigateRoot('contact-chat')
    }
  }
}
