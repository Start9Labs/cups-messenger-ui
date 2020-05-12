import { NextObserver, Observable, concat, Subject, combineLatest, of, interval } from 'rxjs'
import { delay, concatMap, first, tap } from 'rxjs/operators'

export interface Path<S,T> extends Observable<T>, NextObserver<S> {}

function fixInputToPath<S,T>(s: S, p: Path<S,T>): Path<{},T> {
    return Object.assign(p, { next: () => p.next(s) })
}

export function cooldownObservable<T>(cd: number, p: Observable<T>): Observable<T> {
    const $retrigger$ = new Subject()
    const repeatOnCooldown = $retrigger$.pipe(delay(cd), concatMap(() => p), tap(_ => $retrigger$.next()))
    const runImmediately = p.pipe(first())
    return concat(
        runImmediately,
        repeatOnCooldown
    )
}

export function cooldownPath<S,T>(cd: number, p: Path<S,T>, s: S): Observable<T> {
    return cooldownObservable(cd, fixInputToPath(s, p))
}

export const exists = c =>!!c

cooldownObservable(1000, interval(0)).subscribe(console.log)