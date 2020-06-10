import { Injectable } from '@angular/core'
import { Observable, from } from 'rxjs'
import { Storage } from '@ionic/storage'
import { map } from 'rxjs/operators'

/* Pass through class to @ionic/storage in case we need to swap implementations or make uniform storage changes */
@Injectable({
  providedIn: 'root',
})
export class Store {
  constructor (
      private readonly storage: Storage
  ) {}

  getValue$<T>(key: string, fallback?: T): Observable<T> {
    return from(this.storage.get(key)).pipe(map(v => v || fallback))
  }

  deleteValue$(key: string): Observable<any> {
    return from(this.storage.remove(key).catch(console.warn))
  }

  setValue$(key: string, value: any): Observable<any> {
    return from(this.storage.set(key, value))
  }

  ready$() {
    return from(this.storage.ready())
  }
}