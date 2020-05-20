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

export enum CupsMessengerType {
    LIVE,
    STANDARD_MOCK,
    ERROR_MOCK,
    NO_MESSAGES_MOCK,
    AUTH_MOCK,
    FAST_MOCK
}

export interface Config {
    cupsMessenger: {
        type: CupsMessengerType
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
        type: CupsMessengerType.FAST_MOCK,
        url: '/api'
    },
    contactsDaemon: {
        frequency: 5000
    },
    messagesDaemon: {
        frequency: 3000
    },
    loadMesageBatchSize: 15,
    defaultServerTimeout: 180000,
    logs: {
        level: LogLevel.TRACE,
        topics: [LogTopic.CONTACTS, LogTopic.MESSAGES, LogTopic.CURRENT_CONTACT, LogTopic.NAV, LogTopic.NO_TOPIC]
    },
    myTorAddress: window.origin.split('//')[1] || window.origin
}