import { Component, NgZone } from '@angular/core'

import { NavController } from '@ionic/angular'
import { StateIngestionService } from '../services/state/state-ingestion/state-ingestion.service'
import { Auth, AuthStatus } from '../services/state/auth-state'
import { App } from '../services/state/app-state'
import { sent, inbound, failed, attending, server, outbound } from '../services/cups/types'
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
        private readonly zone: NgZone
    ) {}

    async ngOnInit(){
        this.eagerLoad()
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
        await Auth.retrievePassword()
        Auth.emitStatus$().subscribe(s => this.handleAuthChange(s))
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

    eagerLoad(){
        const preloadArea: HTMLElement = document.getElementById('preload')
        preloadArea.appendChild(document.createElement('chevron-up-outline.svg'))
        preloadArea.appendChild(document.createElement('canvas')) // @TODO need?
        preloadArea.appendChild(document.createElement('ion-action-sheet'))
        preloadArea.appendChild(document.createElement('ion-alert'))
        preloadArea.appendChild(document.createElement('ion-avatar'))
        preloadArea.appendChild(document.createElement('ion-back-button'))
        preloadArea.appendChild(document.createElement('ion-button'))
        preloadArea.appendChild(document.createElement('ion-buttons'))
        preloadArea.appendChild(document.createElement('ion-content'))
        preloadArea.appendChild(document.createElement('ion-fab'))
        preloadArea.appendChild(document.createElement('ion-fab-button'))
        preloadArea.appendChild(document.createElement('ion-footer'))
        preloadArea.appendChild(document.createElement('ion-grid'))
        preloadArea.appendChild(document.createElement('ion-header'))
        // preloadArea.appendChild(document.createElement('ion-infinite-scroll'))
        // preloadArea.appendChild(document.createElement('ion-infinite-scroll-content'))
        preloadArea.appendChild(document.createElement('ion-input'))
        preloadArea.appendChild(document.createElement('ion-item'))
        preloadArea.appendChild(document.createElement('ion-item-group'))
        preloadArea.appendChild(document.createElement('ion-item-options'))
        preloadArea.appendChild(document.createElement('ion-item-sliding'))
        preloadArea.appendChild(document.createElement('ion-label'))
        preloadArea.appendChild(document.createElement('ion-list'))
        preloadArea.appendChild(document.createElement('ion-loading'))
        preloadArea.appendChild(document.createElement('ion-row'))
        preloadArea.appendChild(document.createElement('ion-spinner'))
        preloadArea.appendChild(document.createElement('ion-text'))
        preloadArea.appendChild(document.createElement('ion-textarea'))
        preloadArea.appendChild(document.createElement('ion-title'))
        preloadArea.appendChild(document.createElement('ion-toast'))
        preloadArea.appendChild(document.createElement('ion-toolbar'))
        preloadArea.appendChild(document.createElement('text-avatar')) // @TODO need?
    }
}
