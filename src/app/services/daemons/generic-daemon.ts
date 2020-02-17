import { interval, Subscription } from 'rxjs'
import { skipWhile } from 'rxjs/operators'
import { config } from 'src/app/config'

export abstract class CooldownDaemon<T> {
    protected running: Subscription
    constructor(private readonly frequency: number) { }
    private refreshing = false

    start() {
        this.stop()
        console.log(`Daemon starting up...`)
        this.running = interval(this.frequency).pipe(skipWhile(() => this.refreshing)).subscribe(() => {
            console.log(`Daemon refreshing...`)
            this.refreshing = true
            this.refresh('from daemon').then(() => { this.refreshing = false })
        })
    }
    stop(): void {
        return this.running && this.running.unsubscribe()
    }
    abstract refresh(t?: string): Promise<void>
}
