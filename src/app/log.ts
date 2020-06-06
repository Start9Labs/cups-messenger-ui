import { config, LogLevel, LogTopic } from './config'

export const Log = {
    info : (msg, object?, topic?) => safeLog({ level: LogLevel.INFO , msg, object, topic }, console.log ),
    debug: (msg, object?, topic?) => safeLog({ level: LogLevel.DEBUG, msg, object, topic }, console.log),
    trace: (msg, object?, topic?) => safeLog({ level: LogLevel.TRACE, msg, object, topic }, console.log),
    error: (msg, object?, topic?) => safeLog({ level: LogLevel.ERROR, msg, object, topic }, console.error),
    safeLog
}

function safeLog(
    { level, msg, object, topic }: { level: LogLevel; msg: string; object?: any; topic?: LogTopic },
    loggingOverride?: (toLog: string) => void
) {
    const logger = loggingOverride || console.log
    const lLevel = level || LogLevel.INFO
    const lTopic = topic || LogTopic.NO_TOPIC

    if (config.logs.level > lLevel) return

    if(object){
        try {
            logger(`${lTopic}: ${msg}, ${JSON.stringify(object)}`)
        } catch {
            logger(`${lTopic}: ${msg}, ${object}`)
        }
    } else {
        logger(`${lTopic}: ${msg}`)
    }
}