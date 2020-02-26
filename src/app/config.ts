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
    myTorAddress: string
}

export const config: Config = {
    cupsMessenger: {
        mock: true,
        url: window.origin + '/api'
    },
    contactsDaemon: {
        frequency: 10000
    },
    contactMessagesDaemon: {
        frequency: 2500
    },
    loadMesageBatchSize: 15,
    defaultServerTimeout: 180000,
    loglevel: 'Info',
    myTorAddress: window.origin.split('//')[1] || window.origin
}

export function debugLog(s: string){
    if(config.loglevel === 'Debug') console.log(s)
}