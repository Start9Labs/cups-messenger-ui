import { Pipe, PipeTransform } from '@angular/core';
import { Message, attending } from '../services/cups/types';

@Pipe({
  name: 'isAttending'
})
export class IsAttendingPipe implements PipeTransform {

  transform(m: Message): boolean {
    return attending(m)
  }

}
