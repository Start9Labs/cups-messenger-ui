export interface Config {
    cupsMessenger: { 
        mock: boolean 
        url: string
    }
}

export const config: Config = {
    cupsMessenger: { 
        mock: false,
        url: "localhost:8888/api"
    }
}
// qqb7xi75y5qa66dxqxet