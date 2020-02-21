import { NextObserver, Observable, OperatorFunction, Subject, of, Subscription } from 'rxjs'

export class LongSubject<S,T> implements NextObserver<S> {
    readonly path: Observable<T>

    constructor(
        private readonly toPipe: OperatorFunction<S,T>,
        private readonly trigger: Subject<S> = new Subject()
    ){
        this.path = undefined as any
        this.trigger
            .pipe(
                toPipe
            )
    }

    subscribe(o: NextObserver<T | undefined>): Subscription{
        return this.path.subscribe(o)
    }

    next(s: S): void {
        this.trigger.next(s)
    }

    asObservable(): Observable<T | undefined> {
        return this.path
    }
}