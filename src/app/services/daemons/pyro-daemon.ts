import { CupsMessenger } from '../cups/cups-messenger';
import { ServerMessage } from "../cups/types";
import { CooldownDaemon } from "./generic-daemon";
import { GlobalState } from '../global-state';
import { config } from 'src/app/config';

export class PyroDaemon extends CooldownDaemon<ServerMessage[]> {
    constructor(private readonly globe: GlobalState, private readonly cups: CupsMessenger) {
        super(config.pyroDaemon.frequency);
    }
    async refresh(): Promise<void> {
        try {
            const res = await this.cups.messagesShow(this.globe.getCurrentContact())
            this.globe.pokeServerMessages(this.globe.getCurrentContact(), res || [])
        }
        catch (e) {
            console.error(e);
        }
    }
}