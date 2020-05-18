import { Plugins } from '@capacitor/core'
import { BehaviorSubject, Observable } from 'rxjs'
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
        } else {
            this.password = undefined
            this.$status$.next(AuthStatus.UNVERIFED)
        }
    }

    emitStatus$(): Observable<AuthStatus>{
        return this.$status$.asObservable()
    }

    async setPassword(p: string): Promise<void> {
        if(!p) return // empty password not permitted
        await Storage.set({
            key: 'password',
            value: p
        })
        this.init()
    }

    async clearPassword(): Promise<void> {
        await Storage.remove(AuthState.passwordKey)
        this.password = undefined
        this.$status$.next(AuthStatus.UNVERIFED)
    }
}

export const Auth = new AuthState()