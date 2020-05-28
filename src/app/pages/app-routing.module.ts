import { NgModule } from '@angular/core'
import { PreloadAllModules, RouterModule, Routes } from '@angular/router'
import { UnauthGuard } from '../modules/unauth.guard'
import { AuthGuard } from '../modules/auth.guard'

const routes: Routes = [
  {
    path: 'signin',
    canActivate: [UnauthGuard],
    loadChildren: () => import('./signin/signin.module').then( m => m.SigninPageModule)
  },
  {
    path: 'messages',
    canActivate: [AuthGuard],
    loadChildren: () => import('./messages/messages.module').then( m => m.MessagesPageModule)
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadChildren: () => import('./profile/profile.module').then( m => m.ProfilePageModule)
  },
  {
    path: 'contacts',
    canActivate: [AuthGuard],
    loadChildren: () => import('./contacts/contacts.module').then( m => m.ContactsPageModule)
  },
  {
    path: 'new-contact',
    canActivate: [AuthGuard],
    loadChildren: () => import('./new-contact/new-contact.module').then( m => m.NewContactPageModule)
  },
  {
    path: 'me',
    canActivate: [AuthGuard],
    loadChildren: () => import('./me/me.module').then( m => m.MePageModule)
  },
]

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
