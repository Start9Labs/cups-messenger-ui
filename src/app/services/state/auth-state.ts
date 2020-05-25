import { Plugins } from '@capacitor/core'
import { Observable, NextObserver } from 'rxjs'
import { getContext } from 'ambassador-sdk'
import { LogBehaviorSubject } from 'src/rxjs/util'
import { LogLevel, LogTopic } from 'src/app/config'
import { Log } from 'src/app/log'
import { pauseFor } from '../cups/types'

const { Storage } = Plugins

export enum AuthStatus {
    UNVERIFED, VERIFIED, INITIATING
}

export class AuthState {
    private static readonly passwordKey = { key: 'password' }
    password: string = undefined
    private readonly $status$: LogBehaviorSubject<AuthStatus> = new LogBehaviorSubject(AuthStatus.INITIATING, { level: LogLevel.INFO, desc: 'auth' })

    constructor(){}

    async retrievePassword(): Promise<void> {
        const p = await Storage.get(AuthState.passwordKey)

        Log.debug('password retreived from local storage', p, LogTopic.AUTH)

        if(p && p.value){
            this.password = p.value
            this.$status$.next(AuthStatus.VERIFIED)
            return
        }

        Log.debug('We will pause for window.platform. Its presently:', (!!(window as any).platform).toString(), LogTopic.AUTH)
        await pauseFor(500)
        Log.debug('We will consult ambassador context for password?', (!!(window as any).platform).toString(), LogTopic.AUTH)

        if((window as any).platform) {
            const shellPassword = await getContext().getConfigValue(['password'], 5000)

            Log.debug('Retreived shell password', shellPassword, LogTopic.AUTH)
            if(shellPassword){
                await Storage.set({... AuthState.passwordKey, value: shellPassword})
                this.password = shellPassword
                this.$status$.next(AuthStatus.VERIFIED)
                return
            }
        }

        this.password = undefined
        this.$status$.next(AuthStatus.UNVERIFED)
    }

    $ingestStatus(): NextObserver<AuthStatus> {
        return { next: a => this.$status$.next(a) }
    }

    emitStatus$(): Observable<AuthStatus>{
        return this.$status$.asObservable()
    }

    // called from signin page via tor browser after validating against the backend
    async setPassword(p: string): Promise<void> {
        await Storage.set({... AuthState.passwordKey, value: p})
        this.retrievePassword()
    }

    async clearPassword(): Promise<void> {
        await Storage.remove(AuthState.passwordKey)
        this.password = undefined
        this.$status$.next(AuthStatus.UNVERIFED)
    }
}

export const Auth = new AuthState()