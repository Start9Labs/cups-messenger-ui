import { Pipe, PipeTransform } from '@angular/core'
import { Message, server, sent, inbound, attending, failed } from '../services/cups/types'

@Pipe({
  name: 'classify'
})
export class MessageClassificationPipe implements PipeTransform {
  transform(m: Message): MessageClassification {
    if(sent(m)) return MessageClassification.SENT
    if(inbound(m)) return MessageClassification.INBOUND
    if(attending(m)) return MessageClassification.ATTENDING
    return MessageClassification.FAILED
  }
}

export enum MessageClassification {
  SENT = 'SENT',
  INBOUND = 'INBOUND',
  ATTENDING = 'ATTENDING',
  FAILED = 'FAILED'
}
