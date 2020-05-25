import { ElementRef } from '@angular/core'
import { Container, SVG, Gradient, Circle, Line, Color, Shape, ColorLike } from '@svgdotjs/svg.js'
import { MessageClassification, AttendingMessage, SentMessage, attending, FailedMessage, Message, InboundMessage, inbound, sent, failed } from 'src/app/services/cups/types'

export class Tunnel {
    private readonly draw: Container
    private left: Circle
    private right: Circle
    private readonly w: number
    private readonly h: number

    private readonly messagesInFlight: { [trackingId: string]: { shape: Shape, classification: MessageClassification }} = {}

    constructor(canvas: ElementRef<HTMLElement>, view: { w: number, h: number }, firstLetterOfContact: string){
        this.w = view.w
        this.h = view.h
        this.draw = (SVG(canvas.nativeElement) as Container).size('100%', '100%').viewbox(0, 0, this.w, this.h)
        this.initScene()
    }

    private initScene(){
        // this.draw.svg(pipe)
        // this.draw.svg(leftCirle)
        // this.draw.svg(rightCircle)
        this.background()
    }

    send(m : Message){
        if(inbound(m)) return this.sendInbound(m)
        if(sent(m)) return this.sendSent(m)
        return
        // if(failed(m)) return this.markFailed(m)
        // if(attending(m)) return this.sendAttending(m)
    }

    sendInbound(m: InboundMessage){
        if(this.messagesInFlight[m.id]) return

        const message = this.draw.circle(0).fill(rgb(WHITE)).center(this.left.cx(), this.left.cy())
        this.messagesInFlight[m.id] = { shape: message, classification: 'Inbound' }

        const duration = 2000
        message.animate(duration).during(t => {
            flash(this.left, WARNING, WHITE, 0, 1/4)(t)
            if(t>= 1/4) message.radius(5)
            // pulse(this.left, 10, 15, 0, 1/4)(t)

            flash(this.right, PRIMARY, WHITE, 1/2, 1)(t)
            // pulse(this.right, 10, 15, 1/2, 1)(t)

            send(message, this.right.cx(), this.right.cy(), 1/4, 3/4)(t)
            if(t >= 3/4) message.remove()
        })
    }

    sendSent(sentM: SentMessage) {
        if(this.messagesInFlight[sentM.id]) return

        const message = this.draw.circle(0).fill(rgb(WHITE)).center(this.right.cx(), this.right.cy())
        this.messagesInFlight[sentM.id] = { shape: message, classification: 'Sent' }

        const duration = 2000
        message.animate(duration).during(t => {
            flash(this.right, PRIMARY, WHITE, 0, 1/4)(t)
            if(t>= 1/4) message.radius(5)
            // pulse(this.right, 10, 15, 0, 1/4)(t)

            flash(this.left, WARNING, WHITE, 1/2, 1)(t)
            // pulse(this.left, 10, 15, 1/2, 1)(t)

            send(message, this.left.cx(), this.left.cy(), 1/4, 3/4)(t)

            resize(message, 5, 0, 3/4, 1)
            if(t >= 3/4) message.remove()
        })
    }

    private background(){
        // left character
        this.left = this.draw.circle(this.h/2).center(this.w/6, this.h/2).fill(rgb(WARNING))
        // right character
        this.right = this.draw.circle(this.h/2).center(this.w * 5/6, this.h/2).fill(rgb(PRIMARY))

    }

    private linearColorGradient(inner: string, outer: string){
        return this.draw.gradient('linear', (g : Gradient) => {
            g.stop(0, inner)
            g.stop(1, outer)
        })
    }
}

const PRIMARY = [86 , 141, 230] as [number, number, number]
const WARNING = [134, 230, 171] as [number, number, number]
const BLACK   = [0  ,   0,   0] as [number, number, number]
const WHITE   = [255, 255, 255] as [number, number, number]
const RED   = [255, 255, 255] as [number, number, number]
const rgb: (x: [number, number, number]) => ColorLike  = ([r,g,b]) => ({r, g, b} as ColorLike)

function pulse(circle: Circle, base: number, expandTo: number, t0 = 0, t1 = 1){
    return pos => {
        if(pos < t0 || pos > t1) return
        const mid = (t1 + t0) / 2
        const pulsed = linear(base, expandTo, t0, mid)(pos) + linear(expandTo, base, mid, t1)(pos)
        circle.radius(pulsed)
    }
}

function resize(circle: Circle, base: number, expandTo: number, t0 = 0, t1 = 1){
    return pos => {
        if(pos < t0 || pos > t1) return
        const pulsed = linear(base, expandTo, t0, t1)(pos)
        circle.radius(pulsed)
    }
}

function flash(shape: Shape, base: number[], flashTo: number[], t0 = 0, t1 = 1){
    return pos => {
        if(pos < t0 || pos > t1) return
        const mid = (t1 + t0) / 2
        const [r, g, b] = vPlus(linearHighDim(base, flashTo, t0, mid)(pos), linearHighDim(flashTo, base, mid, t1)(pos))
        shape.fill( {r, g, b} as Color )
    }
}

function send(shape: Shape, x1: number, y1: number, t0: number, t1: number){
    return pos => {
        if(pos < t0 || pos > t1) return
        shape.center(linear(shape.cx(), x1, t0, t1)(pos), linear(shape.cy(), y1, t0, t1)(pos))
    }
}

// 0 <= pos <= 1
export type Animation = (pos: number) => void

export type Path<T> = (t: number) => T
function sequence<T>(paths: Path<T>[]): Path<T[]> {
    return t => paths.map(p => p(t))
}

function linearHighDim(p0: number[], p1: number[], t0 = 0, t1 = 1): Path<number[]> {
     return sequence(p0.map( (_, i) =>  linear(p0[i], p1[i], t0, t1 )))
}

function vPlus(p0: number[], p1: number[]): number[] {
    return p0.map( (_, i) => p0[i] + p1[i] )
}

function linear(x1: number, x2: number, t0: number = 0, t1: number = 1): Path<number> {
    return t => {
        if(t < t0 || t > t1) return 0

        const m = (t - t0)/(t1 - t0) // s = t0 => m = 0, t = t1 => m = 1
        return (1 - m) * x1 + m * x2 // t = t0 => x1, t = t1 => x2
    }
}
