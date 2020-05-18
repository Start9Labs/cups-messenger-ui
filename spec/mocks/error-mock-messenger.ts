import { Contact, ObservableOnce } from 'src/app/services/cups/types'
import { timer } from 'rxjs'
import { map } from 'rxjs/operators'
import { StandardMockCupsMessenger } from './mock-messenger'

export class ErrorMockCupsMessenger extends StandardMockCupsMessenger {
    retries = 2
    retryHistory: {[trackingId: string]: number} = {}

    constructor() {
        super()
    }

    messagesSend (contact: Contact, trackingId: string, message: string): ObservableOnce<{}> {
        this.retryHistory[trackingId] = this.retryHistory[trackingId] || 0

        if (this.retryHistory[trackingId] < this.retries) {
            this.retryHistory[trackingId] += 1
            return timer(2000).pipe(map(() => { throw new Error('get fucked') }))
        } else {
            return super.messagesSend(contact, trackingId, message)
        }
    }
}
