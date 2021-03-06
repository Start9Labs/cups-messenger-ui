import { Observable, BehaviorSubject, of, OperatorFunction, from, Subject, NextObserver } from 'rxjs'
import { concatMap, tap, catchError, filter, take, finalize } from 'rxjs/operators'
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
                console.error(`Error in ${processDesc}`, e)
                return of(null)
            }),
            tap(t => Log.trace(processDesc, t)),
            filter(exists)
        )
    }
}

export function overlayLoader<T>(
    loadingProcess: Observable<T>,
    loading: LoadingController,
    loadingDesc: string = 'loading...'
): Observable<T> {
    let loader: HTMLIonLoadingElement

    return from(
        loading.create({
            message: loadingDesc,
            spinner: 'lines',
        }).then(l => {
            loader = l
            loader.present()
        })
    ).pipe(
        concatMap(() => loadingProcess),
        take(1),
        finalize(() => {
            loader.dismiss()
        }),
    )
}

export function both<T>(n1: NextObserver<T>, n2: NextObserver<T>): NextObserver<T> {
    return { next: t => {
        n1.next(t)
        n2.next(t)
    } }
}

export function nonBlockingLoader<T>(
    loadingProcess: Observable<T>,
    loading: Subject<boolean>,
): Observable<T> {
    loading.next(true)
    return loadingProcess.pipe(
        take(1),
        finalize(() => {
            loading.next(false)
        }),
    )
}

export function fromAsyncFunction<T, S>( f: (s: S) => Promise<T>, s?: S): Observable<T>{
    return from(f(s))
}

export const exists = c =>!!c
