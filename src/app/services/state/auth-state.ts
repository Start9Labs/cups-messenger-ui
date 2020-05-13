import { Plugins } from '@capacitor/core'
import { Subject } from 'rxjs'
const { Storage } = Plugins

export class AuthState {
    $password$: Subject<string | undefined> = new Subject()
    password: string | undefined = undefined

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
        return this.$password$.asObservable()
    }
}

export const Auth = new AuthState()

const passwordKey = { key: 'password' }
