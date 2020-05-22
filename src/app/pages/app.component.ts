import { Component, NgZone } from '@angular/core'

import { NavController } from '@ionic/angular'
import { StateIngestionService } from '../services/state/state-ingestion/state-ingestion.service'
import { Auth, AuthStatus } from '../services/state/auth-state'
import { App } from '../services/state/app-state'
import { sent, inbound, failed, attending, server, outbound } from '../services/cups/types'
import { getContext } from 'ambassador-sdk'
import { Router, NavigationStart } from '@angular/router'
import { filter } from 'rxjs/operators'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
    

    constructor(
        private readonly navCtrl: NavController,
        private readonly stateIngestion: StateIngestionService,
        private zone: NgZone,
        private readonly router: Router
    ) {
    }

    ngOnInit(){
        window['Auth'] = Auth
        window['App'] = App
        window['classification'] = {
            inbound,
            sent,
            failed,
            attending,
            server,
            outbound
        }
        window['context'] = getContext()

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
