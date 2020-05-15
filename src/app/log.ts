import { config, LogLevel, LogTopic } from './config'

export const Log = {
    info: (msg, object?, topic?) => safeLog({ level: LogLevel.INFO, msg, object, topic }),
    debug: (msg, object?, topic?) => safeLog({ level: LogLevel.DEBUG, msg, object, topic }),
    trace: (msg, object?, topic?) => safeLog({ level: LogLevel.TRACE, msg, object, topic }),
    safeLog: (is) => safeLog(is)
}

function safeLog({ level, msg, object, topic }: { level: LogLevel; msg: string; object?: any; topic?: LogTopic }) {
    const lLevel = level || LogLevel.INFO
    const lTopic = topic || LogTopic.NO_TOPIC

    if(config.logs.topics.length !== 0 && !config.logs.topics.includes(lTopic)) return
    if (config.logs.level > lLevel) return

    if(object){
        try {
            console.log(`${LogLevel[lLevel]} | ${LogTopic[lTopic]}: ${msg}, ${JSON.stringify(object)}`)
        } catch {
            console.log(`${LogLevel[lLevel]} | ${LogTopic[lTopic]}: ${msg}, ${JSON.stringify(object)}`)
        }
    } else {
        console.log(`${LogLevel[lLevel]} | ${LogTopic[lTopic]}: ${msg}`)
    }
}