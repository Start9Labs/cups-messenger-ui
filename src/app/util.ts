import { MessageBase, isServer } from './services/cups/types'

export const sortByTimestamp =
    (a: MessageBase, b: MessageBase) => {
        const aT = isServer(a) ? a.timestamp : a.sentToServer
        const bT = isServer(b) ? b.timestamp : b.sentToServer
        return bT.getTime() - aT.getTime()
    }

export function uniqueBy<T>(ts : T[], projection: (t: T) => string, prioritized: (t1: T, t2: T) => boolean = (t1, t2) => true): T[] {
    const tracking = { } as { [projected: string] : T }
    ts.forEach( t => {
        if( (tracking[projection(t)] && prioritized(t, tracking[projection(t)])) || !tracking[projection(t)]) {
            tracking[projection(t)] = t
        }
    })
    return Object.values(tracking)
}
