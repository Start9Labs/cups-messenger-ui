import { StandardMockCupsMessenger } from './mock-messenger'
import { of } from 'rxjs'
import { tap, map, delay } from 'rxjs/operators'

export class AuthMockCupsMessenger extends StandardMockCupsMessenger {
    requiredPassword = 'password'

    constructor() {
        super()
    }

    contactsShow(tp?: string) {
        if(tp && tp !== this.requiredPassword){
            return of({}).pipe(
                delay(1000),
                tap(() => { throw { status:401 }}),
                map(() => [])
            )
        } else {
            return super.contactsShow()
        }
    }
}
