import { Observable, concat, interval, NextObserver, BehaviorSubject, Subscriber, PartialObserver, Subscription, Observer } from 'rxjs'
import { delay, concatMap, tap, first } from 'rxjs/operators'
import { Log } from 'src/app/log'
import { LogLevel } from 'src/app/config'

export function cooldown<T>(cd: number, o: Observable<T>): Observable<{}> {
    const runImmediately = o.pipe(first())
    const runThereafterOnCooldown = interval(0).pipe(
        concatMap(_ => o.pipe(delay(cd))),
        tap(_ => Log.trace('cooldown running'))
    )
    return concat(runImmediately, runThereafterOnCooldown)
}

export function logMiddlewearer<T>(level: LogLevel, o: NextObserver<T>): NextObserver<T> {
    return {
        next: t => {
            Log.safeLog({ level, msg: 'observer middlewear', object: t })
            o.next(t)
        }
    }
}

export function logMiddlewearable<T>(level: LogLevel, o: Observable<T>): Observable<T> {
    return o.pipe(tap(t => Log.safeLog({ level, msg: 'observable middlewear', object: t })))
}

export class LogBehaviorSubject<T> extends BehaviorSubject<T> {
    constructor(private readonly level: LogLevel, t: T){
        super(t)
    }

    getValue(): T {
        const t = super.getValue()
        Log.safeLog( {level: this.level, msg: 'subject queried', object: t} )
        return t
    }

    next(t: T){
        Log.safeLog( {level: this.level, msg: 'subject inbound', object: t} )
        super.next(t)
    }
}

export const exists = c =>!!c