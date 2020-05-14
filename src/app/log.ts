import { config, LogLevel } from './config'

export const Log = {
    info: (msg, object?) => safeLog({ level: LogLevel.INFO, msg, object }),
    debug: (msg, object?) => safeLog({ level: LogLevel.DEBUG, msg, object }),
    trace: (msg, object?) => safeLog({ level: LogLevel.TRACE, msg, object }),
    safeLog: (is) => safeLog(is)
}

function safeLog({ level, msg, object }: { level: LogLevel; msg: string; object?: any; }) {
    if (config.loglevel <= level) {
        if(object){
            try {
                console.log(`${LogLevel[level]}: ${msg}, ${JSON.stringify(object)}`)
            } catch {
                console.log(`${LogLevel[level]}: ${msg}, ${JSON.stringify(object)}`)
            }
        } else {
            console.log(`${LogLevel[level]}: ${msg}`)
        }
    }
}