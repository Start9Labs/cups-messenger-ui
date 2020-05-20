import { Plugins } from '@capacitor/core'
import { BehaviorSubject, Observable, NextObserver } from 'rxjs'
import { getContext } from 'ambassador-sdk'
import { LogBehaviorSubject } from 'src/rxjs/util'
import { LogLevel } from 'src/app/config'

const { Storage } = Plugins

export enum AuthStatus {
    UNVERIFED, VERIFIED
}

export class AuthState {
    private static readonly passwordKey = { key: 'password' }
    password: string = undefined
    private readonly $status$: LogBehaviorSubject<AuthStatus> = new LogBehaviorSubject(AuthStatus.UNVERIFED, { level: LogLevel.INFO, desc: 'auth' })

    constructor(){
    }

    async init(): Promise<void> {
        const p = await Storage.get(AuthState.passwordKey)

        if(p && p.value){
            this.password = p.value
            this.$status$.next(AuthStatus.VERIFIED)
            return
        }

        if((window as any).platform) {
            const shellPassword = await getContext().getConfigValue(['password'], 5000)
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

    async setPassword(p: string): Promise<void> {
        if(!p) return // empty password not permitted
        await Storage.set({... AuthState.passwordKey, value: p})
        this.init()
    }

    async clearPassword(): Promise<void> {
        await Storage.remove(AuthState.passwordKey)
        this.password = undefined
        this.$status$.next(AuthStatus.UNVERIFED)
    }
}

export const Auth = new AuthState()