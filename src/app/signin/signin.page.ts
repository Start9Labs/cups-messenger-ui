import { Component, OnInit, NgZone } from '@angular/core'

import { NavController, LoadingController } from '@ionic/angular'
import { globe } from '../services/global-state'
import { CupsMessenger } from '../services/cups/cups-messenger'
import { BehaviorSubject } from 'rxjs'
import { pauseFor } from '../services/cups/types'

@Component({
  selector: 'app-signin',
  templateUrl: './signin.page.html',
  styleUrls: ['./signin.page.scss'],
})
export class SigninPage implements OnInit {
  password = ''
  error$ = new BehaviorSubject(undefined)

  constructor(
    private readonly cups: CupsMessenger,
    private readonly navCtrl: NavController,
    private readonly ngZone: NgZone,
    private readonly loadingCtrl: LoadingController,
  ) { }

  ngOnInit() {
      globe.init().then(() => this.signin())
  }

  async enterCupsMessengerPassword() {
    this.error$.next(undefined)
    const pass = this.password.trim()

    const loader = await this.loadingCtrl.create({
      spinner: 'lines',
    })
    await loader.present()

    try {
      await this.cups.contactsShow(pass)
      await pauseFor(2000)
      await globe.setPassword(pass)
      this.signin()
    } catch (e) {
      this.error$.next(`Invalid Password`)
    } finally {
      loader.dismiss()
    }
  }

  private signin() {
    if (globe.password) {
        this.ngZone.run(() => this.navCtrl.navigateRoot('contact-chat'))
    }
  }
}
