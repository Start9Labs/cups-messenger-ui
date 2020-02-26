import { Component, OnInit, NgZone } from '@angular/core'

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
    private readonly ngZone: NgZone
  ) { }

  ngOnInit() {
      globe.init().then(() => this.signin())
  }

  async enterCupsMessengerPassword() {
    this.error$.next(undefined)
    this.loading$.next(true)

    const pass = this.password.trim()
    console.log('password submitted: ', pass)

    try {
      await this.cups.contactsShow(pass)
      await globe.setPassword(pass)
      this.signin()
    } catch (e) {
      this.error$.next(`Invalid Password`)
    } finally {
      this.loading$.next(false)
    }
  }

  private signin() {
    if (globe.password) {
        console.log('signed in successfully!')
        this.ngZone.run(() => this.navCtrl.navigateRoot('contact-chat'))
    }
  }
}
