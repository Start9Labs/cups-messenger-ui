import { StandardMockCupsMessenger } from './standard-mock';

export class FastMockMessenger extends StandardMockCupsMessenger {
    serverTimeToLoad = 0
}