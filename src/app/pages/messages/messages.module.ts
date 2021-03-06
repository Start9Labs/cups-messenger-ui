import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Routes, RouterModule } from '@angular/router'
import { IonicModule } from '@ionic/angular'
import { MessagesPage } from './messages.page'
import { MessageClassificationPipe } from '../../pipes/classify-message.pipe'
import { SharingModule } from '../../modules/sharing.module'

const routes: Routes = [
    {
        path: '',
        component: MessagesPage,
    },
]

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild(routes),
        SharingModule,
    ],
    exports: [MessageClassificationPipe],
    declarations: [MessagesPage, MessageClassificationPipe],
})
export class MessagesPageModule {}