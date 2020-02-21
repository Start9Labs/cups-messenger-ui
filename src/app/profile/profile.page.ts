import { Component, NgZone } from '@angular/core'
import { Contact } from '../services/cups/types'
import { LoadingController, NavController } from '@ionic/angular'
import { globe } from '../services/global-state'
import { Observable, of } from 'rxjs'
import { take, switchMap } from 'rxjs/operators'
import { CupsMessenger } from '../services/cups/cups-messenger'

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
    private readonly ngZone: NgZone,
    private readonly cups: CupsMessenger
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

    of(this.cups.contactsAdd(updatedContact)).pipe(
      switchMap(() => this.cups.contactsShow().then(cs => globe.$contacts$.next(cs))),
    ).subscribe(
      {
        next: async () => {
          globe.currentContact$.next(updatedContact)
          await loader.dismiss()
          this.ngZone.run(() => {
            this.navCtrl.navigateBack(['contact-chat'])
          })
        },
        error: e => {
          console.error(e)
        }
      }
    )
  }
}

