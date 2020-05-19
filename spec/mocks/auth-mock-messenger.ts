import { StandardMockCupsMessenger } from './mock-messenger'
import { timer, of } from 'rxjs'
import { tap, map, take, delay } from 'rxjs/operators'

export class AuthMockCupsMessenger extends StandardMockCupsMessenger {
    requiredPassword = 'password'

    constructor() {
        super()
    }

    contactsShow(tp?: string) {
        if(tp && tp !== this.requiredPassword){
            return of({}).pipe(
                delay(1000),
                tap(() => { throw new Error('Invalid password!') }),
                map(() => [])
            )
        } else {
            return super.contactsShow()
        }
    }
}
