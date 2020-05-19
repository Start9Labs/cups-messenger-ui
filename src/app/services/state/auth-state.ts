import { Plugins } from '@capacitor/core'
import { BehaviorSubject, Observable } from 'rxjs'
import { getContext } from 'ambassador-sdk'

const { Storage } = Plugins

export enum AuthStatus {
    UNVERIFED, VERIFIED
}

export class AuthState {
    private static readonly passwordKey = { key: 'password' }
    password: string = undefined
    private readonly $status$: BehaviorSubject<AuthStatus> = new BehaviorSubject(AuthStatus.UNVERIFED)

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