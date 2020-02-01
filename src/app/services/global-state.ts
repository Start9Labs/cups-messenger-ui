import { Injectable } from '@angular/core'
import { Contact, mockContact } from './cups-messenger'
import { BehaviorSubject } from 'rxjs'
import { Plugins } from '@capacitor/core'
const { Storage } = Plugins

const passwordKey = { key: 'password' }
@Injectable({providedIn: 'root'})
export class GlobalState {
    private contact$: BehaviorSubject<Contact | undefined> = new BehaviorSubject(undefined)

    constructor() {}

    watchContact(): BehaviorSubject<Contact | undefined> {
        return this.contact$
    }

    pokeContact(c: Contact): void {
        this.contact$.next(c)
    }

    async getPassword(): Promise<string | undefined>  {
        return Storage.get(passwordKey).then(x => x.value)
    }

    async setPassword(p: string): Promise<string> {
        return Storage.set({
            key: 'password',
            value: p
        }).then(() => this.getPassword())
    }

    async clearPassword(): Promise<void> {
        Storage.remove(passwordKey)
    }
}


