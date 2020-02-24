import { Pipe, PipeTransform } from '@angular/core';
import { MessageBase, isAttending } from '../services/cups/types';

@Pipe({
  name: 'isAttending'
})
export class IsAttendingPipe implements PipeTransform {

  transform(m: MessageBase): boolean {
    return isAttending(m)
  }

}
