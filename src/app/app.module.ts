import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { RouteReuseStrategy } from '@angular/router'

import { IonicModule, IonicRouteStrategy } from '@ionic/angular'

import { AppComponent } from './app.component'
import { AppRoutingModule } from './app-routing.module'
import { FormsModule } from '@angular/forms'
import { ContactChatPageModule } from './contact-chat/contact-chat.module'
import { HttpClientModule } from '@angular/common/http'
import { TextAvatarModule } from './text-avatar'

@NgModule({
  declarations: [AppComponent ],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    FormsModule,
    ContactChatPageModule,
    HttpClientModule,
    TextAvatarModule,
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
