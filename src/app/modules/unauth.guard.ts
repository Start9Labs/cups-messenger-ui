import { Injectable } from '@angular/core'
import { CanActivate, Router } from '@angular/router'
import { AuthService, AuthStatus } from '../services/state/auth-service'
import { Log } from '../log'
import { LogTopic } from '../config'

@Injectable({
  providedIn: 'root',
})
export class UnauthGuard implements CanActivate {
  private enabled = false

  constructor (
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {
    this.authService.emitStatus$().subscribe(s => {
        Log.trace('Auth subscriber: UnauthGurad', AuthStatus[s], LogTopic.AUTH)
        switch (s){
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
