import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MobileConversationsPageRoutingModule } from './mobile-conversations-routing.module';

import { MobileConversationsPage } from './mobile-conversations.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MobileConversationsPageRoutingModule
  ],
  declarations: [MobileConversationsPage]
})
export class MobileConversationsPageModule {}
