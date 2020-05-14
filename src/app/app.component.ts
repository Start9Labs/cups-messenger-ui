import { Component, NgZone } from '@angular/core'

import { NavController, MenuController } from '@ionic/angular'
import { ContactWithMessageCount, Contact } from './services/cups/types'
import { Observable, BehaviorSubject, of, from } from 'rxjs'
import { onionToPubkeyString } from './services/cups/cups-res-parser'
import { CupsMessenger } from './services/cups/cups-messenger'
import { tap, concatMap } from 'rxjs/operators'
import { StateIngestionService } from './services/state-ingestion/state-ingestion.service'
import { Auth } from './services/state/auth-state'
import { App } from './services/state/app-state'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
    public contacts$: Observable<ContactWithMessageCount[]>
    public makeNewContactForm = false
    public $submittingNewContact$ = new BehaviorSubject(false)
    public newContactTorAddress: string
    public newContactName: string

    public loading$ = new BehaviorSubject(false)
    public $error$ = new BehaviorSubject(undefined)
    public app = App
    public auth = Auth

    constructor(
        private readonly navCtrl: NavController,
        private readonly cups: CupsMessenger,
        private menu: MenuController,
        private zone: NgZone,
        private readonly stateIngestion: StateIngestionService
    ) {
        stateIngestion.init()
    }

    ngOnInit(){
        Auth.emitPassword$().subscribe(p => {
            this.zone.run(() => {
                if(p){
                    this.navCtrl.navigateRoot('contact-chat')
                } else {
                    this.navCtrl.navigateRoot(['/signin'])
                }
            })
        })
    }

    jumpToChat(c: Contact) {
        App.$ingestCurrentContact.next(c)
        this.menu.close('main-menu')
    }

    toggleNewContact() {
        this.makeNewContactForm = !this.makeNewContactForm
        this.$error$.next(undefined)
    }

    logout(){
        Auth.clearPassword()
        this.menu.close('main-menu')
    }

    async submitNewContact() {
        this.$error$.next(undefined)
        const removeProtocol = this.newContactTorAddress.trim().split('//')[1] || this.newContactTorAddress
        const sanitizedTorOnion = removeProtocol.split('.onion')[0].concat('.onion')

        try {
            onionToPubkeyString(sanitizedTorOnion)
        } catch (e) {
            this.$error$.next(`Invalid V3 Tor Address: ${e.message}`)
            return
        }

        const sanitizedName = this.newContactName.trim()
        if (sanitizedName.length > 255) {
            this.$error$.next(`Name must be less than 255 characters.`)
            return
        }

        this.$submittingNewContact$.next(true)

        const contact = {
            torAddress: sanitizedTorOnion,
            name: sanitizedName
        }

        this.cups.contactsAdd(contact).pipe(
            concatMap(() => this.stateIngestion.refreshContacts()),
        ).subscribe({
            next: () => {
                App.$ingestCurrentContact.next(contact)
                this.$submittingNewContact$.next(false)
                this.newContactTorAddress = undefined
                this.newContactName = undefined
                this.makeNewContactForm = false
            },
            error: e => {
                this.$error$.next(e.message)
                this.$submittingNewContact$.next(false)
            },
        })
    }
}
