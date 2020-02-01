import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ContactChatPage } from './contact-chat.page';

const routes: Routes = [
  {
    path: '',
    component: ContactChatPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ContactChatPageRoutingModule {}
