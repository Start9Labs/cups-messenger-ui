import { Log } from '../log'
import { Injectable } from '@angular/core'

@Injectable({
    providedIn: 'root',
})
export class BackgroundingService {
    private readonly hiddenKey: string
    private readonly visibilityChangeKey: string
    private hidden = false

    pauseCallbacks = []
    resumeCallbacks = []

    constructor() {
        // Set the name of the hidden property and the change event for visibility
        if (typeof document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support 
            this.hiddenKey = 'hidden'
            this.visibilityChangeKey = 'visibilitychange'
        } else if (typeof (document as any).msHidden !== 'undefined') {
            this.hiddenKey = 'msHidden'
            this.visibilityChangeKey = 'msvisibilitychange'
        } else if (typeof (document as any).webkitHidden !== 'undefined') {
            this.hiddenKey = 'webkitHidden'
            this.visibilityChangeKey = 'webkitvisibilitychange'
        }
    

        // Handle page visibility change   
        document.addEventListener(this.visibilityChangeKey, () => this.handleVisibilityChange(), false)
    }


    handleVisibilityChange() {
        console.log('FILTER: visibility change')
        if(document[this.hiddenKey] === this.hidden) return

        this.hidden = document[this.hiddenKey]
        console.log('FILTER: this.hidden', this.hidden)

        if (this.hidden) {
            console.log('FILTER: hidden')
            this.pauseCallbacks.forEach(pc => pc())
        } else {
            console.log('FILTER: visibile')
            this.resumeCallbacks.forEach(rc => rc())
        }
    }

    onPause(pc: () => void){
        this.pauseCallbacks.push(
            () => {
                try{
                    pc()
                } catch (e) {
                    Log.error('Error in pause callback', e)
                }
            }
        )
    }

    onResume(rc: () => void){
        this.pauseCallbacks.push(
            () => {
                try{
                    rc()
                } catch (e) {
                    Log.error('Error in pause callback', e)
                }
            }

        )
    }
}