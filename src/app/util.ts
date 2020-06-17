import { Message, server } from './services/cups/types'

export const sortByTimestampDESC =
    (a: Message, b: Message) => {
        const aT = server(a) ? new Date(a.timestamp) : new Date(a.sentToServer)
        const bT = server(b) ? new Date(b.timestamp) : new Date(b.sentToServer)
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

export function partitionBy<T>(ts: T[], predictate: (t: T) => boolean): { yes: T[], no: T[] } {
    const toReturn = { yes: [], no: [] }
    ts.forEach(t => {
        predictate(t) ? toReturn.yes.push(t) : toReturn.no.push(t)
    })
    return toReturn
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
