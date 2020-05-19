import { Component, OnInit, NgZone } from '@angular/core'

import { NavController, LoadingController } from '@ionic/angular'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { BehaviorSubject, of } from 'rxjs'
import { pauseFor } from '../../services/cups/types'
import { Auth } from '../../services/state/auth-state'
import { StateIngestionService } from 'src/app/services/state/state-ingestion/state-ingestion.service'
import { overlayMessagesLoader } from 'src/rxjs/util'
import { catchError } from 'rxjs/operators'

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
    private readonly stateIngestion: StateIngestionService
  ) { }

  ngOnInit() {
      Auth.init().then(() => this.signin())
  }

  async enterCupsMessengerPassword() {
    this.error$.next(undefined)
    const pass = this.password.trim()

    overlayMessagesLoader(
      this.stateIngestion.refreshContacts(pass), this.loadingCtrl, 'Authenticating...'
    ).subscribe({
      next: async () => {
        await Auth.setPassword(pass)
        this.signin()
      },
      error: () => {
        console.log('We made it to the error')
        this.error$.next(`Invalid Password`)
      }
    })
  }

  private signin() {
    if (Auth.password) {
        this.ngZone.run(() => this.navCtrl.navigateRoot('contacts'))
    }
  }
}
