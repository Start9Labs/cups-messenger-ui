import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { ContactsPageRoutingModule } from './contacts-routing.module'

import { ContactsPage } from './contacts.page'
import { TruncateEllipsesPipe } from '../pipes/truncate-ellipses.pipe'
import { IsAttendingPipe } from '../pipes/is-attending.pipe'
import { IsFailedPipe } from '../pipes/is-failed.pipe'
import { IsServerPipe } from '../pipes/is-server.pipe'
import { SharingModule } from '../share-module/sharing.module'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ContactsPageRoutingModule,
    SharingModule
  ],
  declarations: [ContactsPage],
  exports: [],
})
export class ContactsPageModule {}
