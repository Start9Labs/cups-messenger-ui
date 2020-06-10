import { Injectable } from '@angular/core'
import { Observable, from } from 'rxjs'

import { Storage } from '@ionic/storage'
import { mapTo } from 'rxjs/operators'

@Injectable({
  providedIn: 'root',
})
export class Store {
  constructor (
      private readonly storage: Storage
  ) {}

  getValue(key: string): Observable<any> {
    return from(this.storage.get(key))
  }

  setValue (key: string, value: any): Observable<{}> {
    return from(this.storage.set(key, value)).pipe(mapTo({}))
  }
}