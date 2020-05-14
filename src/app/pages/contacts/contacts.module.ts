import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { ContactsPageRoutingModule } from './contacts-routing.module'

import { ContactsPage } from './contacts.page'
import { SharingModule } from '../../modules/sharing.module'
import { TextAvatarModule } from 'src/app/text-avatar'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ContactsPageRoutingModule,
    SharingModule,
    TextAvatarModule
  ],
  declarations: [ContactsPage],
  exports: [],
})
export class ContactsPageModule {}
