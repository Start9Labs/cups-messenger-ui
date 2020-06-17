import { Pipe, PipeTransform } from '@angular/core'
import { Message } from '../services/cups/types'

@Pipe({
    name: 'classify'
})
export class MessageClassificationPipe implements PipeTransform {
    transform(m: Message): string {
        return m.classification.toUpperCase()
    }
}