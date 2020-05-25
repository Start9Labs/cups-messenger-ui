import { StandardMockCupsMessenger } from './mock-messenger';

export class FastMockMessenger extends StandardMockCupsMessenger {
    serverTimeToLoad = 0
}