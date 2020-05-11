import { Observable, OperatorFunction, BehaviorSubject, merge, combineLatest } from 'rxjs'
import { switchMap, map, delay, tap } from 'rxjs/operators'

export function state<S,T>(forked: (s: S) => Observable<T> ): OperatorFunction<S,[S,T]> {
    return os => os.pipe(
        switchMap(s => forked(s).pipe(map(t => ([s,t] as [S, T]))) )
    )
}

export function cooldown<S,T>(manualTrigger$: Observable<S>, f : OperatorFunction<S,T>, cd: number): Observable<T>{
    const trigger$ = new BehaviorSubject({})
    return merge(
        combineLatest([manualTrigger$, trigger$]).pipe(delay(cd), map(([s, _]) => s), f, tap(_ => trigger$.next({}))),
        manualTrigger$.pipe(f)
    )
}