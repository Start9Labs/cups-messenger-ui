import { Log } from '../log'
import { Injectable } from '@angular/core'

/* 
    platform.ready + pause events do not fire for web apps in a mobile browser (when e.g. the browser is backgrounded).
    We achieve the same functionality here by relying on the page visibility api: 
    https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API 
*/
@Injectable({
    providedIn: 'root',
})
export class BackgroundingService {
    private readonly hiddenKey: string
    private readonly visibilityChangeKey: string
    private hidden = false

    pauseCallbacks: { [name: string]: () => void } = {}
    resumeCallbacks: { [name: string]: () => void } = {}

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
        Log.debug('Visibility changed. [previously hidden, now hidden]', [this.hidden, document[this.hiddenKey]] )
        if(document[this.hiddenKey] === this.hidden) return
        this.hidden = document[this.hiddenKey]
        
        if (document[this.hiddenKey]) {
            Log.debug('Executing pause callbacks')
            Object.values(this.pauseCallbacks).forEach(pc => pc())
        } else {
            Log.debug('Executing resume callbacks')
            Object.values(this.resumeCallbacks).forEach(rc => rc())
        }
    }

    onPause(callback: { name: string, f: () => void }){
        this.pauseCallbacks[callback.name] = () => {
            try{
                callback.f()
            } catch (e) {
                Log.error(`Error in pause callback ${callback.name}`, e)
            }
        }
    }

    onResume(callback: {name: string, f: () => void }){
        this.resumeCallbacks[callback.name] = () => {
            try{
                callback.f()
            } catch (e) {
                Log.error(`Error in resume callback ${callback.name}`, e)
            }
        }
    }
}