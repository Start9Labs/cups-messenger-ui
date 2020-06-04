import { Component, OnInit } from '@angular/core'
import { Auth } from 'src/app/services/state/auth-state'
import { Log } from 'src/app/log'
import { LogTopic, config } from 'src/app/config'
import { ToastController, IonicSafeString } from '@ionic/angular'
import * as QRCode from 'qrcode'

@Component({
  selector: 'app-me',
  templateUrl: './me.page.html',
  styleUrls: ['./me.page.scss'],
})
export class MePage implements OnInit {
  public myTorAddress = config.myTorAddress

  constructor(
    public toastCtrl: ToastController
  ) { }
  
  ngOnInit() {
    this.renderQR()
  }

  logout(){
    Log.debug('Logging out', {}, LogTopic.AUTH)
    Auth.clearPassword()
  }

  renderQR(){
    const canvas = document.getElementById('qr-canvas')
    QRCode.toCanvas(canvas, this.myTorAddress, function (error) {
      if (error) Log.error('unable to display qr code', error)
    })    
  }

  async copyTorAddress() {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.value = this.myTorAddress
    input.focus()
    input.select()
    if (document.execCommand('copy')) {
      this.presentToast()
    } else {
      this.presentToast(false)
    }
  }

  async presentToast (success = true) {
    let message: IonicSafeString
    if (success) {
      message = new IonicSafeString('<ion-icon style="display: inline-block; vertical-align: middle;" name="checkmark-circle-outline" color="success"></ion-icon> <span style="display: inline-block; vertical-align: middle;">Copied to Clipboard</span>')
    } else {
      message = new IonicSafeString('<ion-icon style="display: inline-block; vertical-align: middle;" name="close-circle-outline" color="danger"></ion-icon> <span style="display: inline-block; vertical-align: middle;">Failed to Copy</span>')
    }
    const toast = await this.toastCtrl.create({
        message,
        duration: 2000,
        position: 'bottom',
    })
    await toast.present()
  } 
}
