import { Pipe, PipeTransform } from '@angular/core';
import { MessageBase, isFailed } from '../services/cups/types';

@Pipe({
  name: 'isFailed'
})
export class IsFailedPipe implements PipeTransform {
  transform(m: MessageBase): boolean {
    return isFailed(m)
  }
}
