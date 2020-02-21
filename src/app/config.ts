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
    }
}
