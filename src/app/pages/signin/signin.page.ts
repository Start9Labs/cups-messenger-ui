import { Component, OnInit } from '@angular/core'
import { LoadingController } from '@ionic/angular'
import { BehaviorSubject } from 'rxjs'
import { AuthState } from '../../services/state/auth-state'
import { StateIngestionService } from 'src/app/services/state/state-ingestion/state-ingestion.service'
import { overlayLoader } from 'src/rxjs/util'
import { Log } from 'src/app/log'

@Component({
  selector: 'app-signin',
  templateUrl: './signin.page.html',
  styleUrls: ['./signin.page.scss'],
})
export class SigninPage {
  password = ''
  $error$ = new BehaviorSubject(undefined)

  constructor(
    private readonly loadingCtrl: LoadingController,
    private readonly stateIngestion: StateIngestionService,
    private readonly authState: AuthState,
  ) { }

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
      next: () => this.authState.login$(pass),
      error: (e) => {
        Log.error(`Error on login`, e)
        this.$error$.next(`Invalid Password`)
      }
    })
  }
}
