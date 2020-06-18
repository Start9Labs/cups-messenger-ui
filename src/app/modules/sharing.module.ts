import { NgModule } from '@angular/core'
import { TruncateEllipsesPipe } from '../pipes/truncate-ellipses.pipe'
import { DateDisplayPipe } from '../pipes/date-display-pipe'

@NgModule({
    declarations: [
        TruncateEllipsesPipe,
        DateDisplayPipe
    ],
    exports: [
        TruncateEllipsesPipe,
        DateDisplayPipe
    ]
})
export class SharingModule {}