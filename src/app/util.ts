import { Message, server } from './services/cups/types'
import { config } from './config'

export const sortByTimestamp =
    (a: Message, b: Message) => {
        const aT = server(a) ? a.timestamp : a.sentToServer
        const bT = server(b) ? b.timestamp : b.sentToServer
        return bT.getTime() - aT.getTime()
    }

export function uniqueBy<T>(projection: (t: T) => string, ts : T[], prioritized: (t1: T, t2: T) => boolean = (t1, t2) => true): T[] {
    const tracking = { } as { [projected: string] : T }
    ts.forEach( t => {
        if( (tracking[projection(t)] && prioritized(t, tracking[projection(t)])) || !tracking[projection(t)]) {
            tracking[projection(t)] = t
        }
    })
    return Object.values(tracking)
}

export function diff<T>(arr1: T[], arr2: T[]) { return diffBy(arr1, arr2, a => a)}
export function diffBy<A, A1 extends A, A2 extends A, C> (arr1: A1[], arr2: A2[], compareOn: (a: A) => C) {
     return arr1.filter(x => arr2.map(compareOn).includes(compareOn(x)))
}

// returns ret = [arr1\arr2, arr1 & arr2] such that ret[0].concat(ret[1]) = arr1 (up to ordering)
export function diffByProjection<A, A1 extends A, A2 extends A, C> (projection: (a: A) => C, arr1: A1[], arr2: A2[]): [A1[], (A1 & A2)[]] {
    const toReturn = [[],[]] as [A1[], (A1 & A2)[]]
    arr1.forEach( a1 => {
        if (arr2.map(projection).includes(projection(a1))){
            toReturn[1].push(a1 as A1 & A2)
        } else {
            toReturn[0].push(a1)
        }
    })
    return toReturn
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
