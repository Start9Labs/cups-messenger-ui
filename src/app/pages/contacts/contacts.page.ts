import { Component, OnInit } from '@angular/core'
import { Observable, BehaviorSubject, combineLatest } from 'rxjs'
import { ContactWithMessageMeta, Contact } from '../../services/cups/types'
import { NavController, LoadingController, AlertController } from '@ionic/angular'
import { Log } from 'src/app/log'
import { LogTopic } from 'src/app/config'
import { CupsMessenger } from 'src/app/services/cups/cups-messenger'
import { overlayLoader, nonBlockingLoader } from 'src/rxjs/util'
import { StateIngestionService } from 'src/app/services/state/state-ingestion/state-ingestion.service'
import { concatMap, map, tap, take } from 'rxjs/operators'
import { AppState } from 'src/app/services/state/app-state'

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.page.html',
  styleUrls: ['./contacts.page.scss'],
})
export class ContactsPage implements OnInit {
    public contacts$: Observable<ContactWithMessageMeta[]>
    private $forceRerender$ = new BehaviorSubject({})
    $loading$ = new BehaviorSubject(false)

    constructor(
        private readonly navController: NavController,
        private readonly cups: CupsMessenger,
        private readonly loadingCtrl: LoadingController,
        private readonly stateIngestion: StateIngestionService,
        private readonly alertCtrl: AlertController,
        readonly app: AppState
    ) {
        // By calling $forceRerender$.next, we force app.emitContacts$ to emit again getting most up to date info
        this.contacts$ = combineLatest([this.$forceRerender$, this.app.emitContacts$]).pipe(
            map(([_,cs]) => cs.sort(byMostRecentMessage))
        )
    }

    ngOnInit(){
        this.app.pullContactStateFromStore().subscribe()
        const alreadyHasContacts = this.app.hasLoadedContactsFromBrowserLogin 
        if(!alreadyHasContacts){
            nonBlockingLoader(
                this.stateIngestion.refreshContacts(), this.$loading$,
            ).subscribe(() => {})
        }
    }

    // We want to get up to date contacts immediately even if navigating back to this page from messages
    ionViewWillEnter() {
        this.$forceRerender$.next({})
    }

    ionViewWillLeave() {}

    jumpToChat(contact: ContactWithMessageMeta) {
        Log.trace('jumping to contact', contact, LogTopic.NAV)
        contact.unreadMessages = 0
        this.app.$ingestCurrentContact.next(contact)
        this.app.emitContacts$.pipe(take(1)).subscribe(cs => {
            const i = cs.findIndex(c => c.torAddress === contact.torAddress)
            cs.splice(i, 1, contact)
            this.app.$ingestContacts.next(cs)
        })
        this.navController.navigateForward('messages')
    }

    me(){ this.navController.navigateForward('me') }

    toNewContactPage(){
        this.navController.navigateForward('new-contact')
    }

    deleteContact(c: Contact){
        overlayLoader(
            this.cups.contactsDelete(c).pipe(
                concatMap(() => this.stateIngestion.refreshContacts()),
                tap(() => this.app.deleteContact(c)),
            ),
            this.loadingCtrl, `Deleting ${c.name || 'contact'}...`
        ).subscribe(() => Log.info(`Contact ${c.torAddress} deleted`))
    }

    async presentAlertDelete (c: Contact) {
        const alert = await this.alertCtrl.create({
          backdropDismiss: false,
          header: 'Delete Contact?',
          message: `Your message history will be deleted permanently.`,
          buttons: [
            {
                text: 'Cancel',
                handler: () => {},
            },  
            {
                cssClass: 'alert-danger',
                text: `Delete`,
                handler: () => {
                    this.deleteContact(c)
                },
            },
          ],
        })
        await alert.present()
    }
}

function byMostRecentMessage(a: ContactWithMessageMeta, b: ContactWithMessageMeta): number {
    if(!a.lastMessages[0]) return 1
    if(!b.lastMessages[0]) return -1
    return new Date(b.lastMessages[0].timestamp).getTime() - new Date(a.lastMessages[0].timestamp).getTime()
}