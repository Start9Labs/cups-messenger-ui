import { Component, OnInit, NgZone } from '@angular/core'
import { Observable, BehaviorSubject } from 'rxjs'
import { ContactWithMessageCount, Contact } from '../../services/cups/types'
import { Auth } from '../../services/state/auth-state'
import { App } from '../../services/state/app-state'
import { NavController } from '@ionic/angular'
import { Log } from 'src/app/log'
import { LogTopic } from 'src/app/config'
import { getContext } from 'ambassador-sdk'
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
    ) {
    }

    ngOnInit(){
    }

    jumpToChat(c: Contact) {
        Log.trace('jumping to contact', c, LogTopic.NAV)
        App.$ingestCurrentContact.next(c)
        this.navController.navigateForward('messages')
    }

    logout(){
        Auth.clearPassword()
        if((window as any).platform){
            Log.debug('logging out through shell', getContext(), LogTopic.NAV)
            getContext().close()
        }
    }

    toNewContactPage(){
        this.zone.run(() => {
            this.navController.navigateForward('new-contact')
        })
    }
}
