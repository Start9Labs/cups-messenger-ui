import { Component, OnInit } from '@angular/core'
import { AuthState } from 'src/app/services/state/auth-state'
import { Log } from 'src/app/log'
import { LogTopic, config } from 'src/app/config'
import { ToastController, IonicSafeString, NavController } from '@ionic/angular'
import * as QRCode from 'qrcode'

@Component({
  selector: 'app-me',
  templateUrl: './me.page.html',
  styleUrls: ['./me.page.scss'],
})
export class MePage implements OnInit {
  public myTorAddress = config.myTorAddress

  constructor(
    private readonly toastCtrl: ToastController,
    private readonly authState: AuthState,
    readonly nav: NavController
  ) { }
  
  ngOnInit() {
    this.renderQR()
  }

  logout(){
    Log.debug('Logging out', {}, LogTopic.AUTH)
    this.authState.logout$().subscribe()
  }

  renderQR(){
    const canvas = document.getElementById('qr-canvas')
    QRCode.toCanvas(canvas, this.myTorAddress, function (error) {
      if (error) Log.error('unable to display qr code', error)
    })    
  }

  async copyTorAddress() {
    if (copyToClipboard(this.myTorAddress)) {
      this.presentToast()
    } else {
      this.presentToast(false)
    }
  }

  async presentToast (success = true) {
    let message: IonicSafeString
    if (success) {
      message = new IonicSafeString('<ion-icon style="display: inline-block; vertical-align: middle;" name="checkmark-circle-outline" color="warning"></ion-icon> <span style="display: inline-block; vertical-align: middle;">Copied to Clipboard</span>')
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

function copyToClipboard(str: string): boolean {
  const el = document.createElement('textarea')
  el.value = str
  el.setAttribute('readonly', '')
  el.style.position = 'absolute'
  el.style.left = '-9999px'
  document.body.appendChild(el)
  el.select()
  const copy = document.execCommand('copy')
  document.body.removeChild(el)
  return copy
}