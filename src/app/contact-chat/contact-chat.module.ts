import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { ContactChatPageRoutingModule } from './contact-chat-routing.module'

import { ContactChatPage } from './contact-chat.page'
import { TruncateEllipsesPipe } from '../pipes/truncate-ellipses.pipe'
import { IsAttendingPipe } from '../pipes/is-attending.pipe'
import { IsFailedPipe } from '../pipes/is-failed.pipe'
import { IsServerPipe } from '../pipes/is-server.pipe'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ContactChatPageRoutingModule,
  ],
  exports: [TruncateEllipsesPipe, IsAttendingPipe, IsFailedPipe, IsServerPipe],
  declarations: [ContactChatPage, TruncateEllipsesPipe, IsAttendingPipe, IsFailedPipe, IsServerPipe],
  providers: []
})
export class ContactChatPageModule {}