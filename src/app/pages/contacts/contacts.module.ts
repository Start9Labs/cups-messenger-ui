import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Routes, RouterModule } from '@angular/router'
import { IonicModule } from '@ionic/angular'
import { ContactsPage } from './contacts.page'
import { SharingModule } from '../../modules/sharing.module'

const routes: Routes = [
    {
        path: '',
        component: ContactsPage,
    },
]

@NgModule({
    imports: [
        CommonModule,
        IonicModule,
        RouterModule.forChild(routes),
        SharingModule
    ],
    declarations: [ContactsPage],
})
export class ContactsPageModule {}
