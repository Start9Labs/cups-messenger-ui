import { cooldown } from "src/app/services/state-ingestion/util";
import { interval, timer } from 'rxjs';


import { expect } from 'chai';
import { tap, map } from 'rxjs/operators';
import { assertNotNull } from '@angular/compiler/src/output/output_ast';

describe('Hello function', () => {
  it('should return hello world', () => {  
    let counter = 0
    let shouldContinue = true
    const pipe = cooldown(100, interval(0)).pipe(map(i => {
        counter++
        console.log(i)
    }), takeWhile(shouldContinue)).toPromise()
    
  })
})

