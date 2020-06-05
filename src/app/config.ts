export enum LogLevel {
    TRACE = 1,
    DEBUG = 2,
    INFO = 3,
    ERROR = 4
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
        on: true
    },
    loadMesageBatchSize: 15,
    defaultServerTimeout: 30000,
    logs: {
        level: LogLevel.INFO,
    },
    myTorAddress: removeOnionForAndroid(window.origin.split('//')[1] || window.origin)
}

function removeOnionForAndroid(addr: string): string {
    return addr.endsWith('.onion.onion') ? addr.substr(0, addr.length - 6) : addr
}