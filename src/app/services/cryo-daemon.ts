import { Injectable } from '@angular/core'
import { CupsMessenger, ContactWithMessageCount, Contact, Message } from './cups-messenger'
import { BehaviorSubject, interval, Subscription } from 'rxjs'

export abstract class Daemon<T> {
    protected running: Subscription
    constructor(private readonly frequency: number) {}
    protected results$: BehaviorSubject<T>

    start() {
        this.stop()
        // @TODO get rid of these logs they are for wuss bags
        console.log(`Daemon starting up...`)
        this.running = interval(this.frequency).subscribe( () => {
            console.log(`Daemon refreshing...`)
            this.refresh()
        })
    }

    stop(): void {
        return this.running && this.running.unsubscribe()
    }

    watch(): BehaviorSubject<T> {
        return this.results$
    }

    abstract refresh(): Promise<void>
}

@Injectable({providedIn: 'root'})
export class Cryodaemon extends Daemon<ContactWithMessageCount[]> {
    static frequency = 5000
    protected results$: BehaviorSubject<ContactWithMessageCount[]> = new BehaviorSubject([])

    constructor(private readonly cups: CupsMessenger) {
        super(Cryodaemon.frequency)
    }

    async refresh(): Promise<void> {
        try {
            const res = await this.cups.contactsShow()
            this.results$.next(res)
        } catch (e) {
            console.error(e)
        }
    }
}

export class Pyrodaemon extends Daemon<Message[]> {
    static frequency = 1000
    protected results$: BehaviorSubject<Message[]> = new BehaviorSubject([])

    constructor(private readonly cups: CupsMessenger, private readonly contact: Contact) {
        super(Pyrodaemon.frequency)
    }

    async refresh(): Promise<void> {
        try {
            const res = await this.cups.messagesShow(this.contact)
            this.results$.next(res)
        } catch (e) {
            console.error(e)
        }
    }
}
