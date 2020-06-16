import { Observable, from, BehaviorSubject } from 'rxjs'
import { getContext } from 'ambassador-sdk'
import { fromAsyncFunction } from 'src/rxjs/util'
import { LogTopic, runningOnNativeDevice } from 'src/app/config'
import { Log } from 'src/app/log'
import { Storage } from '@ionic/storage'
import { distinctUntilChanged, concatMap, take } from 'rxjs/operators'
import { Injectable } from '@angular/core'
import { AppState } from './app-state'

export enum AuthStatus {
    UNVERIFED, VERIFIED
}

@Injectable({
  providedIn: 'root',
})
export class AuthState {
    readonly emitStatus$: Observable<AuthStatus>
    password: string = undefined
    private readonly $status$: BehaviorSubject<AuthStatus> = new BehaviorSubject(AuthStatus.UNVERIFED)

    constructor(
        private readonly storage: Storage,
        readonly app: AppState
    ) {
        this.emitStatus$ = this.$status$.asObservable().pipe(distinctUntilChanged())
    }

    // called from signin page via tor browser after validating against the backend
    login$(p: string): Observable<{}> {
        return from(this.storage.set('password', p)).pipe(concatMap(() => this.attemptLogin$()))
    }
    
    attemptLogin$(): Observable<{}> {
        return fromAsyncFunction(async () => {
            // First check if password is in storage from previous login
            const storagePassword = await this.storage.get('password')
            Log.debug('password retreive attempt from local storage', storagePassword, LogTopic.AUTH)
            
            if(storagePassword){
                this.password = storagePassword
                this.$status$.next(AuthStatus.VERIFIED)
                return
            }

            // If we're running on web, there must be a password in storage so...
            if(!runningOnNativeDevice()){
                this.$status$.next(AuthStatus.UNVERIFED)
                return
            }
            
            // On a mobile device, we might have come in from the shell
            let shellPassword = undefined 
            try{
                shellPassword = await getContext().getConfigValue(['password'], 5000)
            } catch (e) {
                Log.error('getConfigValue password exception: ', e)
            }
            
            Log.debug('password retrieve attempt from shell', shellPassword, LogTopic.AUTH)

            if(!shellPassword){
                this.$status$.next(AuthStatus.UNVERIFED)
                return
            }

            await this.storage.set('password', shellPassword)
            this.password = shellPassword
            this.$status$.next(AuthStatus.VERIFIED)
            return {}
        })
    }

    logout$(): Observable<{}> {
        this.password = undefined
        this.$status$.next(AuthStatus.UNVERIFED)
        this.app.wipeState()
        return from(this.storage.remove('password'))
    }
}
