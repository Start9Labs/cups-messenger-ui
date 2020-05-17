import { config, LogLevel, LogTopic } from './config'

export const Log = {
    info : (msg, object?, topic?) => safeLog({ level: LogLevel.INFO , msg, object, topic }, console.info ),
    debug: (msg, object?, topic?) => safeLog({ level: LogLevel.DEBUG, msg, object, topic }, console.debug),
    trace: (msg, object?, topic?) => safeLog({ level: LogLevel.TRACE, msg, object, topic }, console.trace),
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

    if(config.logs.topics.length !== 0 && !config.logs.topics.includes(lTopic)) return
    if (config.logs.level > lLevel) return

    if(object){
        try {
            logger(`${LogTopic[lTopic]}: ${msg}, ${JSON.stringify(object)}`)
        } catch {
            logger(`${LogTopic[lTopic]}: ${msg}, ${JSON.stringify(object)}`)
        }
    } else {
        logger(`${LogTopic[lTopic]}: ${msg}`)
    }
}