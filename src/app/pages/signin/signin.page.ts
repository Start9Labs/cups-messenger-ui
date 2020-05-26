import { Component, OnInit, NgZone } from '@angular/core'

import { NavController, LoadingController } from '@ionic/angular'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { BehaviorSubject, of } from 'rxjs'
import { pauseFor } from '../../services/cups/types'
import { Auth } from '../../services/state/auth-state'
import { StateIngestionService } from 'src/app/services/state/state-ingestion/state-ingestion.service'
import { overlayLoader } from 'src/rxjs/util'
import { catchError } from 'rxjs/operators'
import { Log } from 'src/app/log'

@Component({
  selector: 'app-signin',
  templateUrl: './signin.page.html',
  styleUrls: ['./signin.page.scss'],
})
export class SigninPage implements OnInit {
  password = ''
  $error$ = new BehaviorSubject(undefined)

  constructor(
    private readonly loadingCtrl: LoadingController,
    private readonly stateIngestion: StateIngestionService
  ) { }

  ngOnInit() {
    
  }

  async enterCupsMessengerPassword() {
    this.$error$.next(undefined)
    const pass = this.password.trim()

    if(!pass){
      const e = `Password cannot be empty`
      Log.error(`Error on login`, e)
      this.$error$.next(e)
      return
    }

    overlayLoader(
      this.stateIngestion.refreshContacts(pass), this.loadingCtrl, 'Authenticating...'
    ).subscribe({
      next: () => Auth.setPassword(pass),
      error: (e) => {
        Log.error(`Error on login`, e)
        this.$error$.next(`Invalid Password`)
      }
    })
  }
}
