import { Component, NgZone } from '@angular/core'
import { Contact } from '../../services/cups/types'
import { LoadingController, NavController } from '@ionic/angular'
import { Observable, from } from 'rxjs'
import { take, switchMap, map } from 'rxjs/operators'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { App } from '../../services/state/app-state'

@Component({
  selector: 'profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
})
export class ProfilePage {
    error = ''
    contactName = ''
    app = App

    constructor (
        private readonly loadingCtrl: LoadingController,
        private readonly navCtrl: NavController,
        private readonly ngZone: NgZone,
        private readonly cups: CupsMessenger
    ) { }

    ngOnInit () {
        App.emitCurrentContact$.pipe(take(1)).subscribe(c => {
            this.contactName = c.name
        })
    }

    async save(c: Contact) {
        const loader = await this.loadingCtrl.create({
            message: 'Updating name...',
            spinner: 'lines',
        })
        await loader.present()

        const updatedContact = { ...c, name: this.contactName }

        from(this.cups.contactsAdd(updatedContact)).pipe(
            switchMap(() => this.cups.contactsShow().pipe(map(cs => {
                if(cs.findIndex(co => co.torAddress === updatedContact.torAddress) <= -1) {
                    cs.push({...updatedContact, unreadMessages: 0} )
                }
                App.$ingestContacts.next(cs)
            })))
        ).subscribe({
            next: async () => {
                App.$ingestCurrentContact.next(updatedContact)
                await loader.dismiss()
                this.ngZone.run(() => {
                    this.navCtrl.navigateBack('messages')
                })
            },
            error: e => {
                console.error(e)
            }
        })
    }
}
