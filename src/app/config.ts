export enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    ERROR = 3
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
    loglevel: LogLevel
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
    loglevel: LogLevel.TRACE,
    myTorAddress: window.origin.split('//')[1] || window.origin
}