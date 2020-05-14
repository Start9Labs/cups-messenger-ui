import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { RouteReuseStrategy } from '@angular/router'

import { IonicModule, IonicRouteStrategy } from '@ionic/angular'

import { AppComponent } from './app.component'
import { AppRoutingModule } from './app-routing.module'
import { FormsModule } from '@angular/forms'
import { ContactChatPageModule } from './messages/messages.module'
import { HttpClientModule } from '@angular/common/http'
import { TextAvatarModule } from '../text-avatar'
import { ServiceWorkerModule } from '@angular/service-worker'
import { environment } from '../../environments/environment'
import { TruncateEllipsesPipe } from '../pipes/truncate-ellipses.pipe'

@NgModule({
  declarations: [AppComponent],
  exports: [],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    FormsModule,
    ContactChatPageModule,
    HttpClientModule,
    TextAvatarModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
