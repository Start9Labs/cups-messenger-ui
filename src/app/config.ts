export interface Config {
    cupsMessenger: {
        mock: boolean
        url: string
    }
    cryoDaemon: {
        frequency: number
    }
    pyroDaemon: {
        frequency: number
    }
}

export const config: Config = {
    cupsMessenger: {
        mock: false,
        url: window.origin + '/api'
    },
    cryoDaemon: {
        frequency: 10000
    },
    pyroDaemon: {
        frequency: 2500
    }
}
