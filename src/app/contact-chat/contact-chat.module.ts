import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { ContactChatPageRoutingModule } from './contact-chat-routing.module'

import { ContactChatPage } from './contact-chat.page'
import { TruncateEllipsesPipe } from '../truncate-ellipses.pipe'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ContactChatPageRoutingModule,
  ],
  exports: [TruncateEllipsesPipe],
  declarations: [ContactChatPage, TruncateEllipsesPipe],
  providers: []
})
export class ContactChatPageModule {}