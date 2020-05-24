import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { RouteReuseStrategy } from '@angular/router'

import { IonicModule, IonicRouteStrategy } from '@ionic/angular'

import { AppComponent } from './app.component'
import { AppRoutingModule } from './app-routing.module'
import { MessagesPageModule } from './messages/messages.module'
import { HttpClientModule } from '@angular/common/http'
import { TextAvatarModule } from '../text-avatar'
import { IonicStorageModule } from '@ionic/storage'
import { ServiceWorkerModule } from '@angular/service-worker'
import { environment } from '../../environments/environment'

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    IonicStorageModule.forRoot(),
    AppRoutingModule,
    MessagesPageModule,
    HttpClientModule,
    TextAvatarModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production, registrationStrategy: 'registerImmediately' }),
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
