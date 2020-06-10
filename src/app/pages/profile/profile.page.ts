import { Component, NgZone } from '@angular/core'
import { Contact } from '../../services/cups/types'
import { LoadingController, NavController } from '@ionic/angular'
import { of, BehaviorSubject } from 'rxjs'
import { map, concatMap, tap } from 'rxjs/operators'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { App } from '../../services/state/app-state'
import { StateIngestionService } from 'src/app/services/state/state-ingestion/state-ingestion.service'
import { sanitizeName } from 'src/app/update-contact-util'
import { overlayLoader } from 'src/rxjs/util'

@Component({
  selector: 'profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
})
export class ProfilePage {
    app = App
    contactName = ''
    $error$ = new BehaviorSubject<string>(undefined)

    constructor (
        private readonly loadingCtrl: LoadingController,
        private readonly nav: NavController,
        private readonly zone: NgZone,
        private readonly cups: CupsMessenger,
        private readonly stateIngestion: StateIngestionService
    ) { }

    ngOnInit () {
        this.contactName = App.currentContact.name
    }

    async save(c: Contact) {
        const sanitizedName = sanitizeName(this.contactName)
        overlayLoader(
            of({...c, name: sanitizedName}).pipe(
                map(c2 => {if (c2.name === c.name) throw new Error('Name unchanged.'); return c2}),
                concatMap(c2 => this.cups.contactsAdd(c2)),
                concatMap(c2 => App.replaceCurrentContact$(c2)),
                concatMap(() => this.stateIngestion.refreshContacts()),
            ), this.loadingCtrl, 'Updating name...'
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

