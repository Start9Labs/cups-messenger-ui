import { Observable, NextObserver } from 'rxjs'
import { getContext } from 'ambassador-sdk'
import { LogBehaviorSubject } from 'src/rxjs/util'
import { LogLevel } from 'src/app/config'
import { Storage } from '@ionic/storage'

export enum AuthStatus {
    UNVERIFED, VERIFIED
}

export class AuthState {
    password: string = undefined
    private readonly $status$: LogBehaviorSubject<AuthStatus> = new LogBehaviorSubject(AuthStatus.UNVERIFED, { level: LogLevel.INFO, desc: 'auth' })

    constructor(
      private readonly storage: Storage = new Storage({ }),
    ) {
    }

    async init(): Promise<void> {
        const p = await this.storage.get('password')

        if (p && p.value) {
            this.password = p.value
            this.$status$.next(AuthStatus.VERIFIED)
            return
        }

        if ((window as any).platform) {
            const shellPassword = await getContext().getConfigValue(['password'], 5000)
            if (shellPassword) {
                await this.storage.set('password', shellPassword)
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

    emitStatus$(): Observable<AuthStatus> {
        return this.$status$.asObservable()
    }

    async setPassword(p: string): Promise<void> {
        if (!p) { return } // empty password not permitted
        await this.storage.set('password', p)
        this.init()
    }

    async clearPassword(): Promise<void> {
        await this.storage.remove('password')
        this.password = undefined
        this.$status$.next(AuthStatus.UNVERIFED)
    }
}

export const Auth = new AuthState()
