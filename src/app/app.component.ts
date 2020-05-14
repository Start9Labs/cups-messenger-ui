import { Component, NgZone } from '@angular/core'

import { NavController } from '@ionic/angular'
import { StateIngestionService } from './services/state-ingestion/state-ingestion.service'
import { Auth } from './services/state/auth-state'

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
        this.stateIngestion.init()
        Auth.emitPassword$().subscribe(p => {
            this.zone.run(() => {
                if(p){
                    this.navCtrl.navigateRoot('contacts')
                } else {
                    this.navCtrl.navigateRoot(['/signin'])
                }
            })
        })
    }
}
