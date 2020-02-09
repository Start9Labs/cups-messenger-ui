import { Component, OnInit } from '@angular/core'

import { NavController } from '@ionic/angular'
import { GlobalState } from '../services/global-state'
import { CryoDaemon } from '../services/daemons/cryo-daemon'

@Component({
  selector: 'app-signin',
  templateUrl: './signin.page.html',
  styleUrls: ['./signin.page.scss'],
})
export class SigninPage implements OnInit {
  password = ''

  constructor(private readonly globe: GlobalState, private readonly navCtrl: NavController, private readonly cryoDaemon: CryoDaemon) { }

  ngOnInit() {
      this.globe.init().then(() => this.signin())
  }

  enterCupsMessengerPassword() {
    this.globe.setPassword(this.password).then(  () => this.signin() )
  }

  private signin() {
    if(this.globe.password){
        this.navCtrl.navigateRoot('contact-chat')
    }
  }
}
