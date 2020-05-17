import { Pipe, PipeTransform } from '@angular/core';
import { Message, failed } from '../services/cups/types';

@Pipe({
  name: 'isFailed'
})
export class IsFailedPipe implements PipeTransform {
  transform(m: Message): boolean {
    return failed(m)
  }
}
