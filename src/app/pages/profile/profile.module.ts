import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Routes, RouterModule } from '@angular/router'

import { IonicModule } from '@ionic/angular'

import { ProfilePage } from './profile.page'
import { TextAvatarModule } from '../../text-avatar'

const routes: Routes = [
    {
        path: '',
        component: ProfilePage,
    },
]

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild(routes),
        TextAvatarModule,
    ],
    declarations: [ProfilePage],
})
export class ProfilePageModule {}
