const base32 = require('hi-base32');
import * as h from 'js-sha3'
import { ContactWithMessageCount } from './types';

export class CupsResParser {
    constructor(){}

    contactsShow(rawRes : ArrayBuffer): ContactWithMessageCount[] {
        const p = new ArrayBufferParser(rawRes)
        const toReturn = []
        while(!p.isEmpty){
            try{
                toReturn.push(pullContact(p))
            } catch (e) {
                console.error(`Parsering error ${e}`)
                break;
            }
        }
        return toReturn
    }

    // 0x00 <ED25519 PubKey of Recipient (32 bytes)> <UTF-8 Encoded Message>

    // contactsAdd(): {

    // }
}

const PKEY_LENGTH = 32
const UNREADS_LENGTH = 8
const NAME_LENGTH = 1
const utf8Decoder = new TextDecoder()

function pullContact(p: ArrayBufferParser): ContactWithMessageCount {
    const torAddress   = p.chopNParse(PKEY_LENGTH   , pubkeyToOnion) 
    const unreadsCount = p.chopNParse(UNREADS_LENGTH, bigEndian)
    const nameSize     = p.chopNParse(NAME_LENGTH   , bigEndian)
    const name         = p.chopNParse(nameSize      , a => utf8Decoder.decode(a))

    return { torAddress, unreadMessages: unreadsCount, name }
}

function pubkeyToOnion(pubkey: ArrayBuffer){
    if(pubkey.byteLength != 32){
        throw new Error('Invalid pubkey length')
    }

    const hasher = h.sha3_256.create()
    hasher.update(".onion checksum")
    hasher.update(pubkey)
    hasher.update([3])
    const checksum = hasher.arrayBuffer().slice(0,2)

    const res = new Uint8Array(pubkey.byteLength + checksum.byteLength + 1)

    res.set(new Uint8Array(pubkey), 0)
    res.set(new Uint8Array(checksum), pubkey.byteLength)
    res.set(new Uint8Array([3]), pubkey.byteLength + checksum.byteLength)

    return base32.encode(res).toLowerCase() + ".onion"
}

function onionToPubkey(onion: string): ArrayBuffer {
    const s = onion.split(".")[0].toUpperCase()
    const decoded = new Uint8Array(base32.decode.asBytes(s))

    if(decoded.byteLength > 35) {
        throw new Error('Invalid base32 length.')
    }
    if(decoded[34] !== 3) {
        throw new Error('Invalid version')
    }
    const pubkey = decoded.slice(0, PKEY_LENGTH)

    const hasher = h.sha3_256.create()
    hasher.update(".onion checksum")
    hasher.update(pubkey)
    hasher.update([3])

    const checksum = new Uint8Array(hasher.arrayBuffer().slice(0,2))
    const oldChecksum = decoded.slice(PKEY_LENGTH, PKEY_LENGTH +2 )

    if(!checksum.every( (x, i) => x === oldChecksum[i] )){
        console.log(decoded.slice(PKEY_LENGTH, PKEY_LENGTH +2 ))
        console.log(new Uint8Array(hasher.arrayBuffer().slice(0,2)))
    }
    console.log(pubkey.byteLength)
    return pubkey
}

// pub fn onion_to_pubkey(onion: &str) -> Result<Pubkey, Error> {
//     let s = onion.split(".").next().unwrap();
//     let b = base32::decode(base32::Alphabet::RFC4648 { padding: false }, s)
//         .ok_or_else(|| failure::format_err!("invalid base32"))?;
//     failure::ensure!(b.len() >= 35, "invalid base32 length");
//     failure::ensure!(b[34] == 3, "invalid version");
//     let pubkey = &b[..32];
//     let mut hasher = Sha3_256::new();
//     hasher.input(b".onion checksum");
//     hasher.input(pubkey);
//     hasher.input(&[3]);
//     failure::ensure!(&b[32..34] == &hasher.result()[..2], "invalid checksum");
//     let mut pk = [0; 32];
//     pk.clone_from_slice(pubkey);
//     Ok(Pubkey(pk))
// }

class ArrayBufferParser {
    constructor(private buffer: ArrayBuffer){}

    get isEmpty(): boolean {
        return this.length === 0
    }

    get length(): number {
        return this.buffer.byteLength
    }

    chopNParse<T>(i: number, callback: (a: ArrayBuffer) => T): T {
        const res = this.buffer.slice(0, i)
        this.buffer = this.buffer.slice(i, -1)
        return callback(res)
    }
}

function bigEndian(arrayBuffer: ArrayBuffer): number {
    return new Int8Array(arrayBuffer).reverse().reduce( (acc, next, index) =>
        acc + next * 2 ** index
    , 0)
}