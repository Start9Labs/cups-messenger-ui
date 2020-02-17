import { BehaviorSubject, Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export class DeltaSubject<V> {
  protected readonly subject$: BehaviorSubject<V>
  constructor(v: V) {
      this.subject$ = new BehaviorSubject(v)
  }

  getValue(): V {
    return this.subject$.getValue()
  }

  deltaPoke(update: Partial<V>) {
      const existingValues = this.subject$.getValue()
      const updated = {... existingValues, ...update}
      this.subject$.next(updated)
  }

  watch(): Observable<V> {
    return this.subject$
  }

  watchPresentKey<k extends keyof V>(k: k): Observable<V[k]> {
    return this.watch().pipe(map(v => v[k]))
  }
}
