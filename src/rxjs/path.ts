import { NextObserver, Observable, Subscriber } from 'rxjs'

export interface Path<S, T> extends Observable<T>, NextObserver<S> {
}

export function getDefaultPath<S, T> (): Path<S, T> {
    return Object.assign(new Observable<T>(), { next: s => console.warn(`path received input ${s}`) })
}

export function at<S, T> (s: S, p: Path<S, T>): Path<{}, T> {
    return Object.assign(p, { next: () => p.next(s) })
}

export function run<S,T>(s: S, path: Path<S,T>): Observable<T> {
    return new Observable(subscriber => {
        path.subscribe(subscriber)
        path.next(s)
    })
}
