import * as fs from 'fs'
import { pullContact } from 'cups-res-parser'
import { onionToPubkeyString, onionToPubkey } from 'src/app/services/cups/cups-res-parser'


const res = fs.readFileSync('./contacts-res')
console.log(JSON.stringify(pullContact(res)))

console.log(onionToPubkeyString('g4sg4ubw5z4gi7uj7xncxxcpur542ab34dmlfxs4wxqw7xt6wi7echid'))
