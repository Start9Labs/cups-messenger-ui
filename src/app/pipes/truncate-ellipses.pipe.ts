import { Pipe, PipeTransform } from '@angular/core'
import { Contact } from '../services/cups/types'

@Pipe({
  name: 'truncateEllipses'
})
export class TruncateEllipsesPipe implements PipeTransform {
    transform(contact: Partial<Contact>, allowable: number): string {
        if(!contact) { return }
        const displayName = contact.name || contact.torAddress
        if(!displayName) { return }
        return truncateEllipses(displayName, allowable)
    }
}

function truncateEllipses(text: string, allowable: number): string {
    if(text.length <= allowable) return text

    const splitAt = allowable / 2
    return text.slice(0, splitAt) + '...' + text.slice(-splitAt)
  }