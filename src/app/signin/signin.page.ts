import { Component, OnInit } from '@angular/core'

import { NavController } from '@ionic/angular'
import { globe } from '../services/global-state'
import { CupsMessenger } from '../services/cups/cups-messenger'
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
    await globe.setPassword(this.password)
    await this.cups.contactsShow().handle(async () => {
      this.error$.next(`Invalid Password`)
      await globe.clearPassword()
    })
    this.loading$.next(false)
    this.signin()
  }

  private signin() {
    if (globe.password) {
        console.log('signed in successfully!', globe.password)
        this.navCtrl.navigateRoot('contact-chat')
    }
  }
}
