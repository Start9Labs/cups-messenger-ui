import { Component, OnInit } from '@angular/core'
import { Observable, BehaviorSubject, combineLatest, Subscription } from 'rxjs'
import { ContactWithMessageMeta, Contact } from '../../services/cups/types'
import { NavController, LoadingController, AlertController } from '@ionic/angular'
import { Log } from 'src/app/log'
import { LogTopic } from 'src/app/config'
import { CupsMessenger } from 'src/app/services/cups/cups-messenger'
import { overlayLoader, nonBlockingLoader } from 'src/rxjs/util'
import { StateIngestionService } from 'src/app/services/state/state-ingestion/state-ingestion.service'
import { concatMap, map, tap, take } from 'rxjs/operators'
import { AppState } from 'src/app/services/state/app-state'
import { BackgroundingService } from 'src/app/services/backgrounding-service'

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.page.html',
  styleUrls: ['./contacts.page.scss'],
})
export class ContactsPage implements OnInit {
    public contacts$: Observable<ContactWithMessageMeta[]>
    public unreadsCache: { [tor: string]: BehaviorSubject<{ unreads: number, lastMessageId: string }> } = {}

    private subsToTeardown: Subscription[] = []
    private $forceRerender$ = new BehaviorSubject({})

    $loading$ = new BehaviorSubject(false)

    constructor(
        private readonly navController: NavController,
        private readonly cups: CupsMessenger,
        private readonly loadingCtrl: LoadingController,
        private readonly stateIngestion: StateIngestionService,
        private readonly alertCtrl: AlertController,
        private readonly backgroundService: BackgroundingService,
        readonly app: AppState
    ) {
        // By calling $forceRerender$.next, we force app.emitContacts$ to emit again getting most up to date info
        this.contacts$ = combineLatest([this.$forceRerender$, this.app.emitContacts$]).pipe(
            map(([_,cs]) => cs.sort(byMostRecentMessage))
        )
    }

    ngOnInit(){
        // When we come in from minimized state, 
        this.backgroundService.onResume({
            name: 'refreshContacts',
            f: () => this.$loading$.next(true)
        })

        this.subsToTeardown.push(...[
            this.app.emitContacts$.subscribe(cs => this.updateUnreadsCache(cs)),
            this.app.emitContacts$.subscribe(() => this.$loading$.next(false))
        ])
        
        this.app.pullContactStateFromStore().subscribe(
            () => this.$loading$.next(true)
        )
    }

    /* 
        we require an unreads cache because the UI has more up to date knowledge of unread messages than the server.
        E.g if we go to messages page, UI now knows everything for that contact is now 'read', but the server only knows after 
        the full roundtrip show messages call completes. This cache tracks what the UI knows and expires when a new lastMessageId
        comes back from the server.
    */
    private updateUnreadsCache(cs: ContactWithMessageMeta[]){
        cs.forEach(c => {
            // init unreads cache for c if not there
            this.unreadsCache[c.torAddress] = this.unreadsCache[c.torAddress] || new BehaviorSubject({
                unreads: c.unreadMessages, lastMessageId: c.lastMessages[0] && c.lastMessages[0].id
            })

            // only modify unreads count if lastMessage id is different, which is proof that we legitimately have new unread messages
            const { lastMessageId } = this.unreadsCache[c.torAddress].getValue()
            if(c.lastMessages && c.lastMessages[0] && c.lastMessages[0].id !== lastMessageId) {
                this.unreadsCache[c.torAddress].next({ 
                    unreads: c.unreadMessages, lastMessageId: c.lastMessages[0].id
                })
            }
        })
    }

    private refreshContacts(): void {
        nonBlockingLoader(
            this.stateIngestion.refreshContacts(), this.$loading$,
        ).subscribe()
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

        this.unreadsCache[contact.torAddress].pipe(take(1)).subscribe(val => {
            this.unreadsCache[contact.torAddress].next({lastMessageId: val.lastMessageId, unreads: 0 })
        })

        this.navController.navigateForward('messages')
    }

    toMe(){ this.navController.navigateForward('me') }

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

    ngOnDestroy(): void {
        this.subsToTeardown.forEach(s => s.unsubscribe())
    }
}

function byMostRecentMessage(a: ContactWithMessageMeta, b: ContactWithMessageMeta): number {
    if(!a.lastMessages[0]) return 1
    if(!b.lastMessages[0]) return -1
    return new Date(b.lastMessages[0].timestamp).getTime() - new Date(a.lastMessages[0].timestamp).getTime()
}