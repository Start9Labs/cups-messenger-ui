import { Component } from '@angular/core'
import { Contact } from '../services/cups/types'
import { GlobalState } from '../services/global-state'
import { CupsMessenger } from '../services/cups/cups-messenger'
import { LoadingController, NavController } from '@ionic/angular'

@Component({
  selector: 'profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
})
export class ProfilePage {
  error = ''
  contactName: string
  contact: Contact = { } as Contact

  constructor (
    private readonly globe: GlobalState,
    private readonly cups: CupsMessenger,
    private readonly loadingCtrl: LoadingController,
    private readonly navCtrl: NavController,
  ) { }

  ngOnInit () {
    this.contact = this.globe.getCurrentContact()
    this.contactName = this.contact.name || ''
  }

  async save() {
    const loader = await this.loadingCtrl.create({
      message: 'Updating name...',
      spinner: 'lines',
    })
    await loader.present()

    const updatedContact = { ...this.contact, name: this.contactName }

    try {
      await this.cups.contactsAdd(updatedContact).handle(e => {throw e})
      this.globe.pokeCurrentContact(updatedContact)
      await this.navCtrl.navigateBack(['contact-chat'])
    } catch (e) {
      this.error = `Contact update failed: ${e.message}`
    } finally {
      await loader.dismiss()
    }
  }
}

