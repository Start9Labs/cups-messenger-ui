import { Pipe, PipeTransform } from '@angular/core'
import { Contact } from './services/cups-messenger'

@Pipe({
  name: 'truncateEllipses'
})
export class TruncateEllipsesPipe implements PipeTransform {
    transform(contact: Contact, allowable: number, key): Contact {
        if(!contact) { return }
        let displayName = contact.name || contact.torAddress
        if(!displayName) { return }
        if (displayName.length > allowable) {
            const splitAt = allowable / 2
            displayName = displayName.slice(0, splitAt) + '...' + displayName.slice(-splitAt)
        }

        return Object.assign(contact, { [key]: displayName })
    }
}
