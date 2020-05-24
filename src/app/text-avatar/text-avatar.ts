import { Input, SimpleChanges, Component } from '@angular/core'
import { ColorGenerator } from './color-generator'

@Component({
  selector: 'text-avatar',
  template: `
    <div class="u-text-avatar" [ngStyle]="styles">{{ firstLetter | uppercase }}</div>
  `,
  styleUrls: ['./text-avatar.scss']
})

export class TextAvatarComponent {
  @Input() text: string
  @Input() color: string
  @Input() textColor: string

  public firstLetter = ''

  public styles = {}

  constructor (private colorGenerator: ColorGenerator) {}

  ngOnChanges(changes: SimpleChanges) {
    const text = changes.text ? changes.text.currentValue : null
    const color = changes.color ? changes.color.currentValue : null

    this.firstLetter = this.extractFirstCharacter(text)

    this.styles = {  }
  }

  private extractFirstCharacter(text: string): string {
    return text.charAt(0) || ''
  }

  private backgroundColorHexString(color: string, text: string): string {
    return color || this.colorGenerator.getColor(text)
  }
}