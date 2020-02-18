import { Component, OnInit, NgZone } from '@angular/core'

import { NavController } from '@ionic/angular'
import { GlobalState } from '../services/global-state'
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
    private readonly globe: GlobalState,
    private readonly navCtrl: NavController,
    private readonly ngZone: NgZone
  ) { }

  ngOnInit() {
    this.globe.init().then(() => this.signin())
  }

  async enterCupsMessengerPassword() {
    this.error$.next(undefined)
    this.loading$.next(true)
    await this.globe.setPassword(this.password)
    await this.cups.contactsShow().handle(async () => {
      this.error$.next(`Invalid Password`)
      await this.globe.clearPassword()
    })
    this.loading$.next(false)
    this.signin()
  }

  private signin() {
    if (this.globe.password) {
        console.log('signed in successfully!', this.globe.password)
        this.ngZone.run(async () => {
          await this.navCtrl.navigateRoot('contact-chat')
        })
    }
  }
}
