import { NextObserver, Observable, concat, Subject, combineLatest, of, interval } from 'rxjs'
import { delay, concatMap, first, tap } from 'rxjs/operators'

export interface Path<S,T> extends Observable<T>, NextObserver<S> {}

export function at<S,T>(s: S, p: Path<S,T>): Path<{},T> {
    return Object.assign(p, { next: () => p.next(s) })
}

export function cooldown<T>(cd: number, p: Observable<T>): Observable<T> {
    const $retrigger$ = new Subject()
    const repeatOnCooldown = $retrigger$.pipe(delay(cd), concatMap(() => p), tap(_ => $retrigger$.next()))
    const runImmediately = p.pipe(first())
    return concat(
        runImmediately,
        repeatOnCooldown
    )
}

export const exists = c =>!!c

cooldown(1000, interval(0)).subscribe(console.log)