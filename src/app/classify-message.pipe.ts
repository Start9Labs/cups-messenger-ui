import { Pipe, PipeTransform } from '@angular/core'
import { MessageBase, isServer, isFailed } from './services/cups/types'

@Pipe({
  name: 'classify'
})
export class ClassifyMessagePipe implements PipeTransform {
    transform(m: MessageBase): 'attending' | 'failed' | 'server' {
        if(isServer(m)) return 'server'
        if(isFailed(m)) return 'failed'
        return 'attending'
    }
}