import { Component, OnInit } from '@angular/core'
import { Observable, BehaviorSubject } from 'rxjs'
import { ContactWithMessageCount, Contact } from '../../services/cups/types'
import { Auth } from '../../services/state/auth-state'
import { App } from '../../services/state/app-state'
import { MenuController, NavController } from '@ionic/angular'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { StateIngestionService } from '../../services/state/state-ingestion/state-ingestion.service'
import { onionToPubkeyString } from '../../services/cups/cups-res-parser'
import { concatMap } from 'rxjs/operators'

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.page.html',
  styleUrls: ['./contacts.page.scss'],
})
export class ContactsPage implements OnInit {
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
        private readonly cups: CupsMessenger,
        private readonly stateIngestion: StateIngestionService,
        private readonly navController: NavController
    ) {
    }

    ngOnInit(){
    }

    jumpToChat(c: Contact) {
        App.$ingestCurrentContact.next(c)
        this.navController.navigateForward('messages')
    }

    toggleNewContact() {
        this.makeNewContactForm = !this.makeNewContactForm
        this.$error$.next(undefined)
    }

    logout(){
        Auth.clearPassword()
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
