import { Injectable } from '@angular/core'
import { CupsMessenger } from '../cups/cups-messenger'
import { ContactWithMessageCount } from "../cups/types"
import { CooldownDaemon } from './generic-daemon'
import { GlobalState } from '../global-state'
import { config } from 'src/app/config'

@Injectable({providedIn: 'root'})
export class CryoDaemon extends CooldownDaemon<ContactWithMessageCount[]> {
    constructor(private readonly globe: GlobalState, private readonly cups: CupsMessenger) {
        super(config.cryoDaemon.frequency)
    }

    async refresh(): Promise<void> {
        try {
            const res = await this.cups.contactsShow()
            this.globe.pokeContacts(res)
        } catch (e) {
            console.error(e)
        }
    }
}


