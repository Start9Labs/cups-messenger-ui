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
    AUTH = 'AUTH'
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
        topics: LogTopic[] // Leave this empty for all log topics to be displayed
    }
    myTorAddress: string
}

export const config: Config = {
    cupsMessenger: {
        type: CupsMessengerType.ERROR_MOCK,
        url: '/api'
    },
    contactsDaemon: {
        frequency: 10000,
        on: true
    },
    messagesDaemon: {
        frequency: 3000,
        on: false
    },
    loadMesageBatchSize: 15,
    defaultServerTimeout: 45000,
    logs: {
        level: LogLevel.TRACE,
        topics: [LogTopic.MESSAGES]
    },
    myTorAddress: 'rdu6rtxlazgu5nw4o2sjfpsrnqpkwipk4qqalsb4ky7iyy2ciq5lb6qd.onion'
    // window.origin.split('//')[1] || window.origin
}