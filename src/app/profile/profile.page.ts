import { Component, NgZone } from '@angular/core'
import { Contact } from '../services/cups/types'
import { LoadingController, NavController } from '@ionic/angular'
import { globe } from '../services/global-state'
import { AppDaemons } from '../services/rx/paths'
import * as uuidv4 from 'uuid/v4'
import { Observable } from 'rxjs'
import { take } from 'rxjs/operators'

@Component({
  selector: 'profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
})
export class ProfilePage {
  error = ''
  contactName = ''
  contact$: Observable<Contact>

  constructor (
    private readonly loadingCtrl: LoadingController,
    private readonly navCtrl: NavController,
    private readonly paths: AppDaemons,
    private readonly ngZone: NgZone
  ) { }

  ngOnInit () {
    this.contact$ = globe.currentContact$
    this.contact$.pipe(take(1)).subscribe(c => {
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
    console.log('updated b', updatedContact.name)
    const pid = uuidv4()
    this.paths.$showContacts$.subscribeToId(
        pid,
        async () => {
          await loader.dismiss()
          this.ngZone.run(() => {
            this.navCtrl.navigateBack(['contact-chat'])
          })
        },
        e => {
          loader.dismiss()
          this.error = e
        }, 10000)
    this.paths.$addContact$.next([pid, { contact: updatedContact }])
  }
}

