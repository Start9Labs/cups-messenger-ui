import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Routes, RouterModule } from '@angular/router'
import { IonicModule } from '@ionic/angular'
import { MePage } from './me.page'
import { SharingModule } from 'src/app/modules/sharing.module'

const routes: Routes = [
    {
        path: '',
        component: MePage,
    },
]

@NgModule({
    imports: [
        CommonModule,
        IonicModule,
        RouterModule.forChild(routes),
        SharingModule,
    ],
    declarations: [MePage]
})
export class MePageModule {}
