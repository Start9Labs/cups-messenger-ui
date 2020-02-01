import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ContactChatPageRoutingModule } from './contact-chat-routing.module';

import { ContactChatPage } from './contact-chat.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ContactChatPageRoutingModule
  ],
  declarations: [ContactChatPage]
})
export class ContactChatPageModule {}
