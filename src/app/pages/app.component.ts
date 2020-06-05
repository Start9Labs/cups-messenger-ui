import { Component, NgZone } from '@angular/core'

import { NavController } from '@ionic/angular'
import { StateIngestionService } from '../services/state/state-ingestion/state-ingestion.service'
import { AuthState, AuthStatus } from '../services/state/auth-state'
import { getContext } from 'ambassador-sdk'
import { Log } from '../log'
import { LogTopic } from '../config'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
    constructor(
        private readonly navCtrl: NavController,
        private readonly stateIngestion: StateIngestionService,
        private readonly zone: NgZone,
        private readonly authState: AuthState,
    ) {}

    ngOnInit(){
        this.stateIngestion.init()
        this.authState.retrievePassword().then(() => {
          this.authState.emitStatus$().subscribe(s => this.handleAuthChange(s))
        })
    }

    ngAfterViewInit () {
        getContext().childReady()
    }

    handleAuthChange(s: AuthStatus){
        this.zone.run(() => {
            switch (s) {
                case AuthStatus.UNVERIFED: {
                    if((window as any).platform){
                        Log.debug('Unverified: Popping out to shell', getContext(), LogTopic.AUTH)
                        getContext().close()
                    } else {
                        this.navCtrl.navigateRoot('signin')
                    }
                } break
                case AuthStatus.VERIFIED: this.navCtrl.navigateRoot('contacts'); break
            }
        })
    }
}
