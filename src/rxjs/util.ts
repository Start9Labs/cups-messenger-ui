import { Observable, BehaviorSubject, of, OperatorFunction, combineLatest } from 'rxjs'
import { concatMap, tap, catchError, filter, take, map } from 'rxjs/operators'
import { Log } from 'src/app/log'
import { LogLevel, LogTopic } from 'src/app/config'
import * as uuid from 'uuid'
import { LoadingController } from '@ionic/angular'

// Updates the state of bs with t on subscription. Subscription call back triggered when that update has completed.
export function alterState<T>(bs: BehaviorSubject<T>, t: T): Observable<T> {
    return of({}).pipe(
        concatMap(() => {
            bs.next(t)
            return bs.asObservable()
        }),
        take(1)
    )
}

// Suppressing errors is essential for observables with subscriptions which cannot die, e.g. daemon subscriptions.
// Note that due to the filter, the subscription will never receive 'null' values,
// however, catchError will still run emitting a log record of the exception.
export function suppressErrorOperator<T>(processDesc: string): OperatorFunction<T, T> {
    return o => {
        return o.pipe(
            catchError(e => {
                Log.error(`Error in ${processDesc}`, e)
                return of(null)
            }),
            tap(t => Log.trace(processDesc, t)),
            filter(exists)
        )
    }
}

export function overlayMessagesLoader<T>(
    loading: LoadingController,
    loadingProcess: Observable<T>,
    loadingDesc: string = 'loading...'
): Observable<T> {
    return combineLatest([
        loading.create({
            message: loadingDesc,
            spinner: 'lines',
        }).then(l => { l.present(); return l }),
        loadingProcess
    ]).pipe(
        tap(([l]) => { l.dismiss() }),
        map(([_, p]) => p)
    )
}

// LogBehaviorSubjects simply decorate BehaviorSubjects with logging on ingestion. Any time their state is
// updated (or queried with getValue()) a log will be emitted of that state.
export class LogBehaviorSubject<T> extends BehaviorSubject<T> {
    level: LogLevel = LogLevel.INFO
    desc = 'subject'
    topic: LogTopic = LogTopic.NO_TOPIC

    constructor(t: T, opt?: { level?: LogLevel, topic?: LogTopic, desc?: string }){
        super(t)
        if(opt && opt.level) {
            this.level = opt.level
        }
        if(opt && opt.desc){
            this.desc = opt.desc
        } else {
            this.desc = `subject-${uuid.v4()}`
        }
        if(opt && opt.topic){
            this.topic = opt.topic
        }
    }

    getValue(): T {
        const t = super.getValue()
        Log.safeLog( {level: this.level, topic: this.topic, msg: `${this.desc} queried`, object: t} )
        return t
    }

    next(t: T){
        Log.safeLog( {level: this.level, topic: this.topic, msg: `${this.desc} inbound`, object: t} )
        super.next(t)
    }
}

export const exists = c =>!!c