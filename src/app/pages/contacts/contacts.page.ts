import { Component, OnInit, NgZone } from '@angular/core'
import { Observable, BehaviorSubject } from 'rxjs'
import { ContactWithMessageCount, Contact } from '../../services/cups/types'
import { Auth } from '../../services/state/auth-state'
import { App } from '../../services/state/app-state'
import { NavController } from '@ionic/angular'
import { Log } from 'src/app/log'
import { LogTopic } from 'src/app/config'

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
        private readonly zone: NgZone
    ) {
    }

    ngOnInit(){
    }

    ionViewWillEnter(){
        Log.trace('will enter contacts', {}, LogTopic.NAV)
        App.$ingestCurrentContact.next(undefined)
    }

    jumpToChat(c: Contact) {
        App.$ingestCurrentContact.next(c)
        this.navController.navigateForward('messages')
    }

    logout(){
        Auth.clearPassword()
    }

    async toNewContactPage(){
        this.zone.run(() => {
            this.navController.navigateForward('new-contact')
        })
    }
}
