import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { RouteReuseStrategy } from '@angular/router'
import { HttpClientModule } from '@angular/common/http'

import { IonicModule, IonicRouteStrategy } from '@ionic/angular'
import { IonicStorageModule } from '@ionic/storage'

import { AppComponent } from './app.component'
import { AppRoutingModule } from './app-routing.module'

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    IonicStorageModule.forRoot(),
    AppRoutingModule,
    HttpClientModule,
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
})
export class AppModule {}
