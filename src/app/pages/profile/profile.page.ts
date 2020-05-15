import { Component, NgZone } from '@angular/core'
import { Contact } from '../../services/cups/types'
import { LoadingController, NavController } from '@ionic/angular'
import { of, BehaviorSubject } from 'rxjs'
import { map, concatMap } from 'rxjs/operators'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { App } from '../../services/state/app-state'
import { StateIngestionService } from 'src/app/services/state/state-ingestion/state-ingestion.service'
import { sanitizeName } from 'src/app/update-contact-util'

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
        const loader = await this.loadingCtrl.create({
            message: 'Updating name...',
            spinner: 'lines',
        })
        await loader.present()

        of({}).pipe(
            map(() => {
                const sanitizedName = sanitizeName(this.contactName)
                return {
                    ...c,
                    name: sanitizedName
                }
              }),
              concatMap(c => this.cups.contactsAdd(c)),
              concatMap(c => App.alterCurrentContact$(c)),
              concatMap(() => this.stateIngestion.refreshContacts()),
        ).subscribe({
            next: () => {
              loader.dismiss()
              this.zone.run(() => this.nav.navigateBack('messages'))
            },
            error: e => {
              loader.dismiss()
              this.$error$.next(e.message)
            },
        })
    }
}

