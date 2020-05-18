import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { MessagesPageRoutingModule } from './messages-routing.module'

import { MessagesPage } from './messages.page'
import { IsAttendingPipe } from '../../pipes/is-attending.pipe'
import { IsFailedPipe } from '../../pipes/is-failed.pipe'
import { MessageClassificationPipe } from '../../pipes/is-server.pipe'
import { SharingModule } from '../../modules/sharing.module'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MessagesPageRoutingModule,
    SharingModule
  ],
  exports: [IsAttendingPipe, IsFailedPipe, MessageClassificationPipe],
  declarations: [MessagesPage, IsAttendingPipe, IsFailedPipe, MessageClassificationPipe],
  providers: []
})
export class MessagesPageModule {}