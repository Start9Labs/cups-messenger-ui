import { Injectable } from '@angular/core'
import { CanActivate, Router } from '@angular/router'
import { Auth, AuthStatus } from '../services/state/auth-state'
import { Log } from '../log'

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private enabled = false

  constructor (
    private readonly router: Router,
  ) {
    Auth.emitStatus$().subscribe(s => {
        Log.trace('Auth subscriber: AuthGurad', AuthStatus[s])
        switch (s){
            case AuthStatus.UNVERIFED: this.enabled = false; return
            case AuthStatus.VERIFIED: this.enabled = true; return
        }
    })
  }

  canActivate (): boolean {
    if(!this.enabled){
        this.router.navigateByUrl('/signin')
    }
    return this.enabled
  }
}
