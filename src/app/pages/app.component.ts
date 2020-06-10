import { Component, NgZone } from '@angular/core'

import { NavController } from '@ionic/angular'
import { StateIngestionService } from '../services/state/state-ingestion/state-ingestion.service'
import { AuthState, AuthStatus } from '../services/state/auth-state'
import { getContext } from 'ambassador-sdk'
import { Log } from '../log'
import { runningOnNativeDevice } from '../config'
import { Store } from '../services/state/store'
import { concatMap } from 'rxjs/operators'

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
        private readonly store: Store,
    ) {}

    ngOnInit(){
        this.stateIngestion.init() 
        this.store.ready$().subscribe(Log.info)
        this.authState.attemptLogin$().pipe(
            concatMap(() => this.authState.emitStatus$)
        ).subscribe( s => this.handleAuthChange(s) )
    }

    handleAuthChange(s: AuthStatus){
        this.zone.run(() => {
            switch (s) {
                case AuthStatus.UNVERIFED: {
                    if(runningOnNativeDevice()){
                        getContext().close()
                    } else {
                        this.navCtrl.navigateRoot('signin')
                    }
                } break
                case AuthStatus.VERIFIED: {
                    this.navCtrl.navigateRoot('contacts')
                }
            }
        })
    }
}
