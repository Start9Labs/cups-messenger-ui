import { Injectable } from '@angular/core'
import { Contact, mockContact } from "./cups/types"
import { BehaviorSubject } from 'rxjs'
import { Plugins } from '@capacitor/core'
const { Storage } = Plugins

const passwordKey = { key: 'password' }
@Injectable({providedIn: 'root'})
export class GlobalState {
    public password: string | undefined
    private contact$: BehaviorSubject<Contact | undefined> = new BehaviorSubject(undefined)

    constructor() {}

    watchContact(): BehaviorSubject<Contact | undefined> {
        return this.contact$
    }

    pokeContact(c: Contact): void {
        this.contact$.next(c)
    }

    init(): Promise<void> {
        return Storage.get(passwordKey).then(p => { this.password = p.value })
    }

    async setPassword(p: string): Promise<void> {
        return Storage.set({
            key: 'password',
            value: p
        }).then(() => this.init())
    }

    async clearPassword(): Promise<void> {
        Storage.remove(passwordKey)
    }
}


