import { Component, OnInit } from '@angular/core'

import { NavController } from '@ionic/angular'
import { GlobalState } from '../services/global-state'
import { Cryodaemon } from '../services/cryo-daemon'

@Component({
  selector: 'app-signin',
  templateUrl: './signin.page.html',
  styleUrls: ['./signin.page.scss'],
})
export class SigninPage implements OnInit {
  password = ''

  constructor(private readonly globe: GlobalState, private readonly navCtrl: NavController, private readonly cryoDaemon: Cryodaemon) { }

  ngOnInit() {
      if (this.globe.getPassword()) {
        this.navCtrl.navigateRoot('contact-chat')
      }
  }

  enterCupsMessengerPassword() {
    this.globe.setPassword(this.password)
    this.navCtrl.navigateRoot('contact-chat')
  }
}
