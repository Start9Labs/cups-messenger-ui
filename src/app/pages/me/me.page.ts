import { Component, OnInit } from '@angular/core'
import { Auth } from 'src/app/services/state/auth-state'
import { Log } from 'src/app/log'
import { LogTopic, config } from 'src/app/config'
import * as Clipboard from 'clipboard/dist/clipboard.min.js'
import { ToastController } from '@ionic/angular'

const QRCode = require('qrcode')

@Component({
  selector: 'app-me',
  templateUrl: './me.page.html',
  styleUrls: ['./me.page.scss'],
})
export class MePage implements OnInit {
  public myTorAddress = config.myTorAddress

  private readonly clipboard

  constructor(public toastCtrl: ToastController) {
    this.clipboard = new Clipboard('#cpyBtn')
    this.clipboard.on('success', () => this.showMsg())
  }
  
  ngOnInit() {}

  logout(){
    Log.debug('Logging out', {}, LogTopic.AUTH)
    Auth.clearPassword()
  }

  ionViewDidEnter(){
    this.renderQR()
  }

  renderQR(){
    const canvas = document.getElementById('qr-canvas')
    QRCode.toCanvas(canvas, this.myTorAddress, function (error) {
      if (error) Log.error('unable to display qr code', error)
    })
  }

  copyTorAddress(){
    copyToClipboard(this.myTorAddress)
    this.showMsg()
  }

  async showMsg() {
    const toast = await this.toastCtrl.create({
        message: 'Successfully copied to clipboard',
        duration: 2000,
        position: 'bottom',
    })
    toast.present()
  } 
}

const copyToClipboard = str => {
  const el = document.createElement('textarea')
  el.value = str
  el.setAttribute('readonly', '')
  el.style.position = 'absolute'
  el.style.left = '-9999px'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}