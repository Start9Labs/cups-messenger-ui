import { Component, NgZone } from '@angular/core'

import { NavController } from '@ionic/angular'
import { StateIngestionService } from '../services/state/state-ingestion/state-ingestion.service'
import { Auth, AuthStatus } from '../services/state/auth-state'
import { App } from '../services/state/app-state'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
    constructor(
        private readonly navCtrl: NavController,
        private readonly stateIngestion: StateIngestionService,
        private zone: NgZone
    ) {
    }

    ngOnInit(){
        window['Auth'] = Auth
        window['App'] = App

        this.stateIngestion.init()
        Auth.emitStatus$().subscribe(s => this.handleAuthChange(s))
        Auth.init()
    }

    handleAuthChange(s: AuthStatus){
        this.zone.run(() => {
            switch (s) {
                case AuthStatus.UNVERIFED: this.navCtrl.navigateRoot('signin'); return
                case AuthStatus.VERIFIED: this.navCtrl.navigateRoot('contacts'); return
            }
        })
    }
}
