import * as fs from 'fs';
import { pullContact } from '../../src/app/services/cups/cups-messenger';

const res = fs.readFileSync('./contacts-res')
console.log(JSON.stringify(pullContact(res)))