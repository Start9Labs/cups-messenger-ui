// import { cooldown } from 'src/app/services/state-ingestion/util';
// import { interval, timer, merge, combineLatest } from 'rxjs'


// import { expect } from 'chai'
// import { tap, map, takeWhile, filter, concatMap, take } from 'rxjs/operators'
import { TestScheduler } from 'rxjs/testing'
// import { assertNotNull } from '@angular/compiler/src/output/output_ast'
// import { SelectMultipleControlValueAccessor } from '@angular/forms'
import { sleep } from 'src/app/util'
import { cooldown } from './util'
import { interval } from 'rxjs'
import { concatMap, take } from 'rxjs/operators'


describe('rx tests', () => {
  let scheduler: TestScheduler
  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => actual === expected)
  })


  it('cooldown', () => {
    // expect(1).toEqual(2)
    scheduler.run( helpers => {
      const pipe$ = cooldown(1, interval(0).pipe(concatMap(i => sleep(5).then(() => i)), take(3)))
      const expected = '0------1------(2|)'
      helpers.expectObservable(pipe$).toBe(expected, { 1: 1 })
    })
  })
})

