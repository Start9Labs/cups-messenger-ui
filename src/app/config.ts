export interface Config {
    cupsMessenger: { 
        mock: boolean 
        url: string
    }
}

export const config: Config = {
    cupsMessenger: { 
        mock: true,
        url: "http://localhost:59001"
    }
}