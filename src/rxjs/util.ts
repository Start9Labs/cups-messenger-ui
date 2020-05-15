import { Observable, NextObserver, BehaviorSubject, of } from 'rxjs'
import { concatMap, tap } from 'rxjs/operators'
import { Log } from 'src/app/log'
import { LogLevel } from 'src/app/config'

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

export function alterState<T>(bs: BehaviorSubject<T>, t: T): Observable<T> {
    return of(t).pipe(concatMap(() => {
        bs.next(t)
        return bs.asObservable()
    }))
}

export class LogBehaviorSubject<T> extends BehaviorSubject<T> {
    level: LogLevel = LogLevel.INFO
    desc = 'subject'

    constructor(t: T, opt?: { level?: LogLevel, desc?: string }){
        super(t)
        if(opt && opt.level) {
            this.level = opt.level
        }
        if(opt && opt.desc){
            this.desc = opt.desc
        }
    }

    getValue(): T {
        const t = super.getValue()
        Log.safeLog( {level: this.level, msg: `${this.desc} queried`, object: t} )
        return t
    }

    next(t: T){
        Log.safeLog( {level: this.level, msg: `${this.desc} inbound`, object: t} )
        super.next(t)
    }
}

export const exists = c =>!!c