import { Injectable } from '@angular/core'
import { CanActivate, Router } from '@angular/router'
import { Auth, AuthStatus } from '../services/state/auth-state'
import { Log } from '../log'
import { LogTopic } from '../config'

@Injectable({
  providedIn: 'root',
})
export class UnauthGuard implements CanActivate {
  private enabled = false

  constructor (
    private readonly router: Router,
  ) {
    Auth.emitStatus$().subscribe(s => {
        Log.trace('Auth subscriber: UnauthGurad', AuthStatus[s], LogTopic.AUTH)
        switch (s){
            case AuthStatus.INITIATING: this.enabled = true; return
            case AuthStatus.UNVERIFED: this.enabled = true; return
            case AuthStatus.VERIFIED: this.enabled = false; return
        }
    })
  }

  canActivate (): boolean {
    if(!this.enabled){
        this.router.navigateByUrl('/contacts')
    }
    return this.enabled
  }
}
