import { Component, OnInit, NgZone } from '@angular/core'
import { Observable, BehaviorSubject, Subscription } from 'rxjs'
import { ContactWithMessageCount, Contact } from '../../services/cups/types'
import { Auth } from '../../services/state/auth-state'
import { App } from '../../services/state/app-state'
import { NavController, LoadingController } from '@ionic/angular'
import { Log } from 'src/app/log'
import { LogTopic } from 'src/app/config'
import { getContext } from 'ambassador-sdk'
import { overlayMessagesLoader } from 'src/rxjs/util'
import { StateIngestionService } from 'src/app/services/state/state-ingestion/state-ingestion.service'
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
        private readonly navController: NavController,
        private readonly zone: NgZone,
        private readonly loadingCtrl: LoadingController,
        private readonly stateIngestion: StateIngestionService
    ) {
    }

    ngOnInit(){
        overlayMessagesLoader(this.loadingCtrl, this.stateIngestion.refreshContacts(), 'Fetching contacts...').subscribe(() => {
            console.log(`initted`)
        })
    }

    jumpToChat(c: Contact) {
        Log.trace('jumping to contact', {}, LogTopic.NAV)
        App.$ingestCurrentContact.next(c)
        this.navController.navigateForward('messages')
    }

    logout(){
        Auth.clearPassword()
        if((window as any).platform){
            getContext().close()
        }
    }

    toNewContactPage(){
        this.zone.run(() => {
            this.navController.navigateForward('new-contact')
        })
    }
}
