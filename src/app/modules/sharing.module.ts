import { NgModule } from '@angular/core'
import { TruncateEllipsesPipe } from '../pipes/truncate-ellipses.pipe'

@NgModule({
  declarations: [
    TruncateEllipsesPipe,
  ],
  exports: [
    TruncateEllipsesPipe,
  ]
})
export class SharingModule {
}