import { Injectable } from '@angular/core'
import { Observable, from, of } from 'rxjs'

import { Storage } from '@ionic/storage'
import { catchError } from 'rxjs/operators'

@Injectable({
  providedIn: 'root',
})
export class Store {
  constructor (
      private readonly storage: Storage
  ) {}

  getValue$(key: string): Observable<any> {
    return from(this.storage.get(key))
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