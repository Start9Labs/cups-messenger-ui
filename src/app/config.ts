export enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    ERROR = 3
}

export enum LogTopic {
    NAV = 'NAV',
    CONTACTS = 'CONTACTS',
    CURRENT_CONTACT = 'CURRENT_CONTACT',
    MESSAGES = 'MESSAGE',
    NO_TOPIC = 'NO_TOPIC'
}

export interface Config {
    cupsMessenger: {
        mock: boolean
        url: string
    }
    contactsDaemon: {
        frequency: number
    }
    messagesDaemon: {
        frequency: number
    }
    loadMesageBatchSize: number
    defaultServerTimeout: number
    logs: {
        level: LogLevel,
        topics: LogTopic[] // Leave this empty for all log topics to be displayed
    }
    myTorAddress: string
}

export const config: Config = {
    cupsMessenger: {
        mock: true,
        url: '/api'
    },
    contactsDaemon: {
        frequency: 5000
    },
    messagesDaemon: {
        frequency: 1000
    },
    loadMesageBatchSize: 15,
    defaultServerTimeout: 180000,
    logs: {
        level: LogLevel.TRACE,
        topics: [LogTopic.NAV, LogTopic.CURRENT_CONTACT]
    },
    myTorAddress: window.origin.split('//')[1] || window.origin
}