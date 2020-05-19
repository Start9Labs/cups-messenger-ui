import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { MessagesPageRoutingModule } from './messages-routing.module'

import { MessagesPage } from './messages.page'
import { MessageClassificationPipe } from '../../pipes/classify-message.pipe'
import { SharingModule } from '../../modules/sharing.module'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MessagesPageRoutingModule,
    SharingModule
  ],
  exports: [MessageClassificationPipe],
  declarations: [MessagesPage, MessageClassificationPipe],
  providers: []
})
export class MessagesPageModule {}