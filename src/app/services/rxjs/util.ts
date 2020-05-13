import { Observable, concat, Subject, interval, NextObserver } from 'rxjs'
import { delay, concatMap, tap, take, first } from 'rxjs/operators'
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

export const exists = c =>!!c