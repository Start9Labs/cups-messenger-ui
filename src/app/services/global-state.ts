import { Injectable } from '@angular/core'
import { Contact, mockContact } from './cups-messenger'
import { BehaviorSubject } from 'rxjs'

@Injectable({providedIn: 'root'})
export class GlobalState {
    private password?: string
    private contact$: BehaviorSubject<Contact | undefined> = new BehaviorSubject(undefined)

    constructor() {}

    watchContact(): BehaviorSubject<Contact | undefined> {
        return this.contact$
    }

    pokeContact(c : Contact): void {
        this.contact$.next(c)
    }

    getPassword(): string | undefined  {
        return this.password
    }

    setPassword(p: string): void {
        this.password = p
    }
}
