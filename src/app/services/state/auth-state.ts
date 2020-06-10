import { Observable } from 'rxjs'
import { getContext } from 'ambassador-sdk'
import { LogBehaviorSubject } from 'src/rxjs/util'
import { LogLevel, LogTopic } from 'src/app/config'
import { Log } from 'src/app/log'
import { pauseFor } from '../cups/types'
import { Storage } from '@ionic/storage'
import { distinctUntilChanged } from 'rxjs/operators'
import { Injectable } from '@angular/core'

export enum AuthStatus {
    UNVERIFED, VERIFIED
}

@Injectable({
  providedIn: 'root',
})
export class AuthState {
    password: string = undefined
    private readonly $status$: LogBehaviorSubject<AuthStatus> = new LogBehaviorSubject(AuthStatus.UNVERIFED, { level: LogLevel.INFO, desc: 'auth' })

    constructor(
        private readonly storage: Storage,
    ) {}
    
    async retrievePassword(): Promise<void> {
        const p = await this.storage.get('password')
        
        Log.debug('password retreived from local storage', p, LogTopic.AUTH)

        if(p){
            this.password = p
            this.$status$.next(AuthStatus.VERIFIED)
            return
        }

        if((window as any).platform) {
            try{
                const shellPassword = await getContext().getConfigValue(['password'], 5000)

                Log.debug('Retreived shell password', shellPassword, LogTopic.AUTH)
                if(shellPassword){
                    await this.storage.set('password', shellPassword)
                    this.password = shellPassword
                    this.$status$.next(AuthStatus.VERIFIED)
                    return
                }
            } catch (e){
                Log.error('Error in retrieving shell pw: ' + e)
            }
        }

        this.$status$.next(AuthStatus.UNVERIFED)
    }

    emitStatus$(): Observable<AuthStatus> {
        return this.$status$.asObservable().pipe(distinctUntilChanged())
    }

    // called from signin page via tor browser after validating against the backend
    async setPassword(p: string): Promise<void> {
        await this.storage.set('password', p)
        this.retrievePassword()
    }

    async clearPassword(): Promise<void> {
        await this.storage.remove('password')
        this.password = undefined
        this.$status$.next(AuthStatus.UNVERIFED)
    }
}
