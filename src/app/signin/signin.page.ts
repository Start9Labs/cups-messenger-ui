import { Component, OnInit } from '@angular/core'

import { NavController } from '@ionic/angular'
import { GlobalState, globe } from '../services/global-state'
import { CryoDaemon } from '../services/rx/cryo-daemon'
import { CupsMessenger } from '../services/cups/cups-messenger'
import { pauseFor } from '../services/cups/types'
import { BehaviorSubject } from 'rxjs'

@Component({
  selector: 'app-signin',
  templateUrl: './signin.page.html',
  styleUrls: ['./signin.page.scss'],
})
export class SigninPage implements OnInit {
  password = ''
  loading$ = new BehaviorSubject(false)
  error$ = new BehaviorSubject(undefined)

  constructor(
    private readonly cups: CupsMessenger,
    private readonly navCtrl: NavController,
  ) { }

  ngOnInit() {
      globe.init().then(() => this.signin())
  }

  async enterCupsMessengerPassword() {
    this.error$.next(undefined)
    this.loading$.next(true)
    await pauseFor(500000)
    await globe.setPassword(this.password)
    await this.cups.contactsShow().handle(async e => {
      this.error$.next(`Invalid password`)
      await globe.clearPassword()
    })
    this.loading$.next(false)
  }

  private signin() {
    if (globe.password) {
        this.navCtrl.navigateRoot('contact-chat')
    }
  }
}
