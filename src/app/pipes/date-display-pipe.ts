import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name: 'dateDisplay'
})
export class DateDisplayPipe implements PipeTransform {
    transform(date: Date | string, short?: boolean): string {
        const toRender = new Date(date)
        if(short) return this.shortTransform(toRender)
        const now = new Date()
        const timeDiff = now.getTime() - toRender.getTime() 
        const dayDiff = timeDiff / (1000 * 3600 * 24)

        if(dayDiff < 1) return toRender.toLocaleTimeString([], { hour: 'numeric', minute: 'numeric'})
        if(dayDiff < 2) return 'Yesterday, ' + toRender.toLocaleTimeString([], { hour: 'numeric', minute: 'numeric'})
        if(dayDiff < 7) return toRender.toLocaleTimeString([], { weekday: 'long' , hour: 'numeric', minute: 'numeric'})
        return toRender.toLocaleDateString([], { hour: 'numeric', month: 'numeric', day: 'numeric', year: 'numeric'})
    }

    shortTransform(toRender: Date){
        const now = new Date()
        const timeDiff = now.getTime() - toRender.getTime() 
        const dayDiff = timeDiff / (1000 * 3600 * 24)
        if(dayDiff < 1) return toRender.toLocaleTimeString([], { hour: 'numeric', minute: 'numeric'})
        return toRender.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' })
    }
}