import { Component, OnInit, NgZone, ViewChild, ElementRef } from '@angular/core'
import { Observable, BehaviorSubject, combineLatest } from 'rxjs'
import { ContactWithMessageMeta, Contact } from '../../services/cups/types'
import { Auth } from '../../services/state/auth-state'
import { App } from '../../services/state/app-state'
import { NavController, LoadingController, AlertController } from '@ionic/angular'
import { Log } from 'src/app/log'
import { LogTopic } from 'src/app/config'
import { getContext } from 'ambassador-sdk'
import { CupsMessenger } from 'src/app/services/cups/cups-messenger'
import { overlayLoader } from 'src/rxjs/util'
import { StateIngestionService } from 'src/app/services/state/state-ingestion/state-ingestion.service'
import { concatMap, map } from 'rxjs/operators'

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.page.html',
  styleUrls: ['./contacts.page.scss'],
})
export class ContactsPage implements OnInit {
    @ViewChild('animation') animation: ElementRef<HTMLElement>

    public contacts$: Observable<ContactWithMessageMeta[]>
    private $forceRerender$ = new BehaviorSubject({})

    constructor(
        private readonly navController: NavController,
        private readonly zone: NgZone,
        private readonly cups: CupsMessenger,
        private readonly loadingCtrl: LoadingController,
        private readonly stateIngestion: StateIngestionService,
        private readonly nav: NavController,
        private readonly alertCtrl: AlertController
    ) {
        this.contacts$ = combineLatest([this.$forceRerender$, App.emitContacts$]).pipe(
            map(([_,cs]) => cs.sort(byMostRecentMessage))
        )
    }


    ngOnInit(){
        if(!App.hasLoadedContacts){
            overlayLoader(
                this.stateIngestion.refreshContacts(), this.loadingCtrl, 'Fetching contacts...'
            ).subscribe(() => {})
        }
    }

    ionViewWillEnter() {
        this.$forceRerender$.next({})
    }

    ionViewWillLeave() {
    }

    jumpToChat(c: Contact) {
        Log.trace('jumping to contact', c, LogTopic.NAV)
        App.$ingestCurrentContact.next(c)
        this.navController.navigateForward('messages')
    }

    me(){
        this.navController.navigateForward('me')
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

    async presentAlertDelete (c: Contact) {
        const alert = await this.alertCtrl.create({
          backdropDismiss: false,
          cssClass: 'alert-danger',
          header: 'Delete Contact?',
          message: `Your message history will be deleted permanently.`,
          buttons: [
            {
                text: 'Cancel',
                handler: () => {},
            },  
            {
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