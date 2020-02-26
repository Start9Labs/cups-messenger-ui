type LogLevel = 'Info' | 'Debug'

export interface Config {
    cupsMessenger: {
        mock: boolean
        url: string
    }
    contactsDaemon: {
        frequency: number
    }
    contactMessagesDaemon: {
        frequency: number
    }
    loadMesageBatchSize: number
    defaultServerTimeout: number
    loglevel: LogLevel
}

export const config: Config = {
    cupsMessenger: {
        mock: false,
        url: window.origin + '/api'
    },
    contactsDaemon: {
        frequency: 10000
    },
    contactMessagesDaemon: {
        frequency: 2500
    },
    loadMesageBatchSize: 10,
    defaultServerTimeout: 15000,
    loglevel: 'Debug'
}

export function debugLog(s: string){
    if(config.loglevel === 'Debug') console.log(s)
}