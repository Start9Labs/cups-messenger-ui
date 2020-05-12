import { Observable, OperatorFunction, BehaviorSubject, merge, combineLatest, Subject, defer, of, interval, timer } from 'rxjs'
import { switchMap, map, delay, tap, mergeMap, concatMap } from 'rxjs/operators'

export function state<S,T>(forked: (s: S) => Observable<T> ): OperatorFunction<S,[S,T]> {
    return os => os.pipe(
        switchMap(s => forked(s).pipe(map(t => ([s,t] as [S, T]))) )
    )
}

export function cooldown<T>(cd: number, overrideTrigger$: Observable<{}>, o : Observable<T>): Observable<T>{
    const trigger$ = new Subject()
    return merge(
        trigger$.pipe(delay(cd), mergeMap(() => o), tap(_ => trigger$.next({}))),
    )
}

export function cooldown2<T>(cd: number, o: Observable<T>): Observable<{}> {
    return interval(0).pipe(concatMap(() => timer(cd).pipe(() => o)))
}