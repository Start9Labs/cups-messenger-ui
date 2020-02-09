import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MobileConversationsPage } from './mobile-conversations.page';

const routes: Routes = [
  {
    path: '',
    component: MobileConversationsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MobileConversationsPageRoutingModule {}
