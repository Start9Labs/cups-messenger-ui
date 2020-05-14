import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { ContactChatPageRoutingModule } from './messages-routing.module'

import { ContactChatPage } from './messages.page'
import { IsAttendingPipe } from '../../pipes/is-attending.pipe'
import { IsFailedPipe } from '../../pipes/is-failed.pipe'
import { IsServerPipe } from '../../pipes/is-server.pipe'
import { SharingModule } from '../../modules/sharing.module'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ContactChatPageRoutingModule,
    SharingModule
  ],
  exports: [IsAttendingPipe, IsFailedPipe, IsServerPipe],
  declarations: [ContactChatPage, IsAttendingPipe, IsFailedPipe, IsServerPipe],
  providers: []
})
export class ContactChatPageModule {}