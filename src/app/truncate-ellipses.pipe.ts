import { Pipe, PipeTransform } from '@angular/core'
import { Contact } from "./services/cups/types"

@Pipe({
  name: 'truncateEllipses'
})
export class TruncateEllipsesPipe implements PipeTransform {
    transform(contact: Contact, allowable: number, key): Contact {
        if(!contact) { return }
        let displayName = contact.name || contact.torAddress
        if(!displayName) { return }
        displayName = truncateEllipses(displayName, allowable)
        return Object.assign(contact, { [key]: displayName })
    }
}

function truncateEllipses(text: string, allowable: number): string {
    if(text.length <= allowable) return text
    
    const splitAt = allowable / 2
    return text.slice(0, splitAt) + '...' + text.slice(-splitAt)
  }