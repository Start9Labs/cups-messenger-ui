import { ServerMessage } from 'src/app/services/cups/types'
import { StandardMockCupsMessenger } from './standard-mock'

export class NoMessagesMockCupsMessenger extends StandardMockCupsMessenger {
    mocks: {[tor: string]: ServerMessage[]} = {}
    counter = 0
    constructor() {
        super()
        this.contacts.forEach( c => {
            this.mocks[c.torAddress] = []
        })
    }
}
