import { Component, OnInit, NgZone } from '@angular/core';
import { onionToPubkeyString } from 'src/app/services/cups/cups-res-parser';
import { Subject, BehaviorSubject } from 'rxjs';
import { concatMap, take, tap } from 'rxjs/operators';
import { StateIngestionService } from 'src/app/services/state/state-ingestion/state-ingestion.service';
import { NavController } from '@ionic/angular';
import { CupsMessenger } from 'src/app/services/cups/cups-messenger';
import { App } from 'src/app/services/state/app-state';

@Component({
  selector: 'app-new-contact',
  templateUrl: './new-contact.page.html',
  styleUrls: ['./new-contact.page.scss'],
})
export class NewContactPage implements OnInit {
  name = ''
  torAddress = ''
  $error$ = new BehaviorSubject<string>(undefined)
  $submittingNewContact$ = new BehaviorSubject(false)

  constructor(
    private readonly cups: CupsMessenger, 
    private readonly stateIngestion: StateIngestionService,
    private readonly nav: NavController,
    private readonly zone: NgZone
  ) { }

  ngOnInit() {
    this.$error$.next(undefined)
    this.$submittingNewContact$.next(false)
  }

  async save() {
    this.$error$.next(undefined)
    const removeProtocol = this.torAddress.trim().split('//')[1] || this.torAddress
    const sanitizedTorOnion = removeProtocol.split('.onion')[0].concat('.onion')

    const sanitizedName = this.name.trim()
    if (sanitizedName.length > 255) {
        this.$error$.next(`Name must be less than 255 characters.`)
        return
    } else if (sanitizedName.length <= 0) {
        this.$error$.next(`Name cannot be empty.`)
        return
    }

    try {
        onionToPubkeyString(sanitizedTorOnion)
    } catch (e) {
        this.$error$.next(`Invalid Cups Tor Address.`)
        return
    }

    App.emitContacts$.pipe(take(1)).subscribe(cs => {
      cs.map(c => c.torAddress).includes(sanitizedTorOnion)
    })

    this.$submittingNewContact$.next(true)

    const contact = {
        torAddress: sanitizedTorOnion,
        name: sanitizedName
    }

    App.emitContacts$.pipe(take(1)).pipe(
        tap(cs => {
          const preexisting = cs.find(c => c.torAddress === sanitizedTorOnion)
          if(preexisting){
            throw new Error(`Contact ${preexisting.name} already has that tor address.`)
          }
        }),
        concatMap(() => this.cups.contactsAdd(contact)),
        concatMap(() => this.stateIngestion.refreshContacts()),
    ).subscribe({
        next: () =>  this.zone.run(() => this.nav.back()),
        error: e => {
            this.$error$.next(e.message)
            this.$submittingNewContact$.next(false)
        },
    })
}
}
