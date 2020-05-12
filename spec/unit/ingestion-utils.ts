import { cooldownObservable } from "src/app/services/state-ingestion/util";
import { interval, timer } from 'rxjs';


import { expect } from 'chai';
import { tap, map } from 'rxjs/operators';
import { assertNotNull } from '@angular/compiler/src/output/output_ast';

describe('Hello function', () => {
  it('should return hello world', () => {  
    let counter = 0
    const sub = cooldownObservable(100, interval(0)).pipe(map(i => {
        counter++
        console.log(i)
    })).toPromise()
    
    .subscribe(i => {
        
    })
    timer(750).pipe(tap(() => sub.unsubscribe())).subscribe(_ => {
    })
  })
})

