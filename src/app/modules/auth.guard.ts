import { Injectable } from '@angular/core'
import { CanActivate, Router } from '@angular/router'
import { AuthState, AuthStatus } from '../services/state/auth-state'
import { Log } from '../log'
import { LogTopic } from '../config'

@Injectable({
    providedIn: 'root',
})
export class AuthGuard implements CanActivate {
    private enabled = false

    constructor (
        private readonly router: Router,
        private readonly authState: AuthState,
    ) {
        this.authState.emitStatus$.subscribe(s => {
            Log.trace('Auth subscriber: AuthGurad', AuthStatus[s], LogTopic.AUTH)
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
