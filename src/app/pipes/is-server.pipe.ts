import { Pipe, PipeTransform } from '@angular/core';
import { MessageBase, isServer } from '../services/cups/types';

@Pipe({
  name: 'isServer'
})
export class IsServerPipe implements PipeTransform {
  transform(m: MessageBase): boolean {
    return isServer(m)
  }
}
