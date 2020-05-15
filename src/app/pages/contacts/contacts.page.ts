import { Component, OnInit, NgZone } from '@angular/core'
import { Observable, BehaviorSubject } from 'rxjs'
import { ContactWithMessageCount, Contact } from '../../services/cups/types'
import { Auth } from '../../services/state/auth-state'
import { App } from '../../services/state/app-state'
import { MenuController, NavController } from '@ionic/angular'
import { CupsMessenger } from '../../services/cups/cups-messenger'
import { StateIngestionService } from '../../services/state/state-ingestion/state-ingestion.service'
import { onionToPubkeyString } from '../../services/cups/cups-res-parser'
import { concatMap } from 'rxjs/operators'
import { Log } from 'src/app/log'

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
        private readonly navController: NavController,
        private readonly zone: NgZone
    ) {
    }

    ngOnInit(){
    }

    jumpToChat(c: Contact) {
        App.$ingestCurrentContact.next(c)
        this.navController.navigateForward('messages')
    }

    logout(){
        Auth.clearPassword()
    }

    async toNewContactPage(c: Contact){
        this.zone.run(() => {
            this.navController.navigateForward('new-contact')
        })
    }
}
