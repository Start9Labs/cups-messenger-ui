import { Pipe, PipeTransform } from '@angular/core';
import { Message, server } from '../services/cups/types';

@Pipe({
  name: 'isServer'
})
export class IsServerPipe implements PipeTransform {
  transform(m: Message): boolean {
    return server(m)
  }
}
