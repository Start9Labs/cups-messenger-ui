import { Component, OnInit, NgZone, ViewChild, ElementRef } from '@angular/core'
import { Observable, BehaviorSubject, from } from 'rxjs'
import { ContactWithMessageMeta, Contact } from '../../services/cups/types'
import { Auth } from '../../services/state/auth-state'
import { App } from '../../services/state/app-state'
import { NavController, LoadingController } from '@ionic/angular'
import { Log } from 'src/app/log'
import { LogTopic } from 'src/app/config'
import { getContext } from 'ambassador-sdk'
import { CupsMessenger } from 'src/app/services/cups/cups-messenger'
import { overlayLoader } from 'src/rxjs/util'
import { StateIngestionService } from 'src/app/services/state/state-ingestion/state-ingestion.service'
import { concatMap, mergeMap } from 'rxjs/operators'
import { SVG, Container }from '@svgdotjs/svg.js'
@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.page.html',
  styleUrls: ['./contacts.page.scss'],
})
export class ContactsPage implements OnInit {
    @ViewChild('animation') animation: ElementRef<HTMLElement>

    public contacts$: Observable<ContactWithMessageMeta[]>
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
        private readonly cups: CupsMessenger,
        private readonly loadingCtrl: LoadingController,
        private readonly stateIngestion: StateIngestionService,
        private readonly nav: NavController
    ) {
    }


    ngOnInit(){
        if(!this.app.hasLoadedContacts){
            overlayLoader(
                this.stateIngestion.refreshContacts(), this.loadingCtrl, 'Fetching contacts...'
            ).subscribe(() => {})
        }
    }

    ionViewWillEnter() {
    }

    ionViewWillLeave() {
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

    deleteContact(c: Contact){
        overlayLoader(
            this.cups.contactsDelete(c).pipe(
                concatMap(() => this.stateIngestion.refreshContacts())
            ),
            this.loadingCtrl, `Deleting ${c.name || 'contact'}...`
        ).subscribe(() => Log.info(`Contact ${c.torAddress} deleted`))
    }

    editContact(c: Contact){
        this.app.alterCurrentContact$(c).subscribe(() => {
            this.zone.run(() => {
                this.nav.navigateForward('profile')
            })
        })
    }
}
