import { Plugins } from '@capacitor/core'
import { Subject, BehaviorSubject } from 'rxjs'
import { filter } from 'rxjs/operators'
import { exists } from '../rxjs/util'
const { Storage } = Plugins

export class AuthState {
    $password$: BehaviorSubject<string | undefined> = new BehaviorSubject(undefined)
    password: string | undefined = undefined

    constructor(){
        this.$password$.subscribe(p => {this.password = p})
    }

    async init(): Promise<void> {
        const p = await Storage.get(passwordKey)
        this.$password$.next(p.value)
    }

    async setPassword(p: string): Promise<void> {
        if(!p) return
        await Storage.set({
            key: 'password',
            value: p
        })
        this.init()
    }

    async clearPassword(): Promise<void> {
        await Storage.remove(passwordKey)
        this.$password$.next(undefined)
    }

    emitPassword$() {
        return this.$password$.asObservable().pipe(filter(exists))
    }
}

export const Auth = new AuthState()

const passwordKey = { key: 'password' }
