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
    NO_TOPIC = 'NO_TOPIC',
    AUTH = 'AUTH',
    NO_LOGS = 'NO_LOGS' //config.ts: ```topics: [LogTopic.NO_LOGS]``` disables logs
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
        on: boolean
    }
    messagesDaemon: {
        frequency: number
        on: boolean
    }
    loadMesageBatchSize: number
    defaultServerTimeout: number
    logs: {
        level: LogLevel,
    }
    myTorAddress: string
}

export const config: Config = {
    cupsMessenger: {
        type: CupsMessengerType.STANDARD_MOCK,
        url: '/api'
    },
    contactsDaemon: {
        frequency: 10000,
        on: true
    },
    messagesDaemon: {
        frequency: 3000,
        on: true
    },
    loadMesageBatchSize: 15,
    defaultServerTimeout: 30000,
    logs: {
        level: LogLevel.TRACE,
    },
    myTorAddress: window.origin.split('//')[1] || window.origin
}