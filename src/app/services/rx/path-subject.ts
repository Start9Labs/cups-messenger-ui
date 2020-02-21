import { NextObserver, Observable, OperatorFunction, Subject, of, PartialObserver, Subscription, race, interval } from 'rxjs'

import { switchMap, map, filter, take, catchError } from 'rxjs/operators'

export class PathSubject<S, T> implements NextObserver<[string, S]>{
    readonly path: Observable<[string, T]>

    constructor(
        private readonly toPipe: OperatorFunction<S, T>,
        private readonly internalTrigger = new Subject<[string, S]>()
    ) {
        this.path = this.internalTrigger.pipe(
            switchMap(([pid, s]) =>
                of(s).pipe(
                    toPipe,
                    map(t => ([pid, t] as [string, T])),
                    catchError(e => {
                        console.error(e)
                        return of([pid, undefined] as [string, T])
                    }))
        ))
    }

    next([pid, s]: [string, S]): void {
        this.internalTrigger.next([pid, s])
    }

    subscribe<T0 extends T>(o: PartialObserver<T0>): Subscription {
        return this.path.pipe(map(([_, t]) => t)).subscribe(o)
    }

    subscribeM<T1>(o: PartialObserver<T1>, project: (t: T) => T1): Subscription {
        return this.path.pipe(map(([_, t]) => project(t))).subscribe(o)
    }

    subscribeToId(pid: string, next: (t: T) => void, err: (msg: string) => void, timeout: number): Subscription {
        return race(
            this.path.pipe(filter(([id,_]) => id === pid)), interval(timeout)
        ).pipe(
            take(1),
            map(res => {
                if(res[0] === pid) {
                    return res[1]
                } else {
                    throw new Error(`time out for pipeId ${pid}`)
                }
            }),
            catchError(e => of(err(e.message)))
        ).subscribe(next)
    }

    subscribePath<U>(p : PathSubject<T, U>): Subscription {
        return this.path.subscribe(p)
    }

    subscribeAfterPath<U, S0 extends S>(p : PathSubject<U, S0>): Subscription {
        return p.path.subscribe(this)
    }
}

export function compSub<S,T,T0 extends T, U>( p0: PathSubject<S,T0>, p1: PathSubject<T,U> ): Subscription {
    return p0.path.subscribe(p1)
}



export class PathSubject2<S,T> implements NextObserver<[string, S]>{
    private readonly pathSub: Subscription
    constructor(
        private readonly toPipe: OperatorFunction<S, T>,
        private readonly source = new Subject<[string, S]>(),
        private readonly sink = new Subject<[string, T]>()
    ) {
        this.pathSub = this.source.pipe(
            switchMap(([pid, s]) =>  of(s).pipe(toPipe, map(t => ([pid, t] as [string, T]))))
        ).subscribe(this.sink)
    }

    next([pid, s]: [string, S]): void {
        this.source.next([pid, s])
    }


}