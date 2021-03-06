import { Component, OnInit, NgZone } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { concatMap, take, map } from 'rxjs/operators'
import { StateIngestionService } from 'src/app/services/state/state-ingestion/state-ingestion.service'
import { NavController, LoadingController } from '@ionic/angular'
import { CupsMessenger } from 'src/app/services/cups/cups-messenger'
import { sanitizeOnion, ensureNewTor as ensureNewTorAddress, sanitizeName } from 'src/app/update-contact-util'
import { overlayLoader } from 'src/rxjs/util'
import { AppState } from 'src/app/services/state/app-state'

@Component({
  selector: 'app-new-contact',
  templateUrl: './new-contact.page.html',
  styleUrls: ['./new-contact.page.scss'],
})
export class NewContactPage implements OnInit {
    name = ''
    torAddress = ''
    $error$ = new BehaviorSubject<string>(undefined)

    constructor(
        private readonly cups: CupsMessenger,
        private readonly stateIngestion: StateIngestionService,
        readonly nav: NavController,
        private readonly zone: NgZone,
        private readonly loadingCtrl: LoadingController,
        readonly app: AppState
    ) { }

    ngOnInit() {}

    ionViewWillEnter(){
        this.$error$.next(undefined)
    }

    wipeCurrentContact(){
        this.app.replaceCurrentContact$(undefined)
    }

    async save() {
        this.$error$.next(undefined)
        this.app.emitContacts$.pipe(take(1)).pipe(
            map(cs => {
                const sanitizedTorOnion = ensureNewTorAddress(
                    cs, sanitizeOnion(this.torAddress)
                )
                const sanitizedName = sanitizeName(this.name)
                return {
                    torAddress: sanitizedTorOnion,
                    name: sanitizedName
                }
            }),
            concatMap(c =>
                overlayLoader(
                    this.cups.contactsAdd(c).pipe(
                        concatMap(() => this.stateIngestion.refreshContacts())
                    )
                    , this.loadingCtrl
                    , 'Creating contact...'
                )
            )
        ).subscribe({
            next: () => {
                this.zone.run(() => this.nav.back())
            },
            error: e => {
                this.$error$.next(e.message)
            },
        })
    }
}
