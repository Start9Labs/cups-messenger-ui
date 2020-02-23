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
        mock: true,
        url: window.origin + '/api'
    },
    contactsDaemon: {
        frequency: 10000
    },
    contactMessagesDaemon: {
        frequency: 1000
    }
}
