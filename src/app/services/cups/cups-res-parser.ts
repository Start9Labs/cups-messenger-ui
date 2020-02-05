import * as base32 from 'lib/hi-base32'
import * as h from 'js-sha3'
import { ContactWithMessageCount, Message, MessageDirection } from './types';
const utf8Decoder = new TextDecoder()
const utf8Encoder = new TextEncoder()
import * as uuidv4 from 'uuid/v4'

export class CupsResParser {
    constructor(){}

    deserializeContactsShow(rawRes : ArrayBuffer): ContactWithMessageCount[] {
        const p = new ArrayBufferParser(rawRes)
        if(p.isEmpty) return []
        const toReturn = []
        while(!p.isEmpty){
            try{
                toReturn.push(pullContact(p))
            } catch (e) {
                console.error(`Contact parsing error ${e}`)
                break;
            }
        }
        return toReturn
    }

    deserializeMessagesShow(rawRes: ArrayBuffer): Message[] {
        const p = new ArrayBufferParser(rawRes)
        if(p.isEmpty) return []
        const toReturn = []
        while(!p.isEmpty){
            try{
                toReturn.push(pullMessage(p))
            } catch (e) {
                console.error(`Message parsing error ${e}`)
                break;
            }
        }
        return toReturn
    }

    serializeContactsAdd(torAddress: string, name: string): ArrayBuffer {
        const torBytes = onionToPubkey(torAddress)
        const nameBytes = utf8Encoder.encode(name)
        return bufferArrayConcat([new Uint8Array([1]).buffer, torBytes, nameBytes])
    }

    serializeSendMessage(torAddress: string, message: string): ArrayBuffer {
        const torBytes = onionToPubkey(torAddress)
        const messageBytes = utf8Encoder.encode(message)
        return bufferArrayConcat([new Uint8Array([0]), torBytes, messageBytes]) 
    }
}

class ArrayBufferParser {
    private buffer: ArrayBuffer
    constructor(buffer: ArrayBuffer | undefined){
        this.buffer = buffer || new ArrayBuffer(0)
    }

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

const PKEY_LENGTH = 32
const UNREADS_LENGTH = 8
const NAME_LENGTH = 1
function pullContact(p: ArrayBufferParser): ContactWithMessageCount {
    const torAddress   = p.chopNParse(PKEY_LENGTH   , pubkeyToOnion) 
    const unreadsCount = p.chopNParse(UNREADS_LENGTH, bigEndian)
    const nameSize     = p.chopNParse(NAME_LENGTH   , bigEndian)
    const name         = p.chopNParse(nameSize      , a => utf8Decoder.decode(a))

    return { torAddress, unreadMessages: unreadsCount, name }
}

function pullMessage(p: ArrayBufferParser): Partial<Message> {
    const direction: MessageDirection   = p.chopNParse(1, byteToMessageDirection) 
    const epochTime: number = p.chopNParse(4,signedBigEndian32)
    const messageLength = p.chopNParse(8, bigEndian)
    const text = p.chopNParse(messageLength, a => utf8Decoder.decode(a))
    return { id: uuidv4(), direction, timestamp: new Date(epochTime), text }
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

    const res = bufferArrayConcat([pubkey, checksum, new Uint8Array(3)])
    return base32.encode(res).toLowerCase() + ".onion"
}

export function onionToPubkey(onion: string): ArrayBuffer {
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
        throw new Error ('Invalid checksum')
    }
    return pubkey
}

export function onionToPubkeyString(onion: string): string {
    const arrayBuffer = onionToPubkey(onion)
    return base32.encode(arrayBuffer).toLowerCase()
}

function bigEndian(arrayBuffer: ArrayBuffer): number {    
    return new Int8Array(arrayBuffer).reverse().reduce( (acc, next, index) => {
        return acc + next * 256 ** index
    }, 0)
}

function signedBigEndian32(a: ArrayBuffer): number {
    const dv = new DataView(new Uint8Array(a).reverse())
    return dv.getInt32(0)
}

function byteToMessageDirection(a: ArrayBuffer): MessageDirection {
    if(a.byteLength !== 1) {
        throw new Error (`invalid message direction`)
    }

    if(a[0] === 0) {
        return 'Inbound'
    } else if (a[0] === 1){
        return 'Outbound'
    } else {
        throw new Error (`invalid message direction`)
    }
}

function bufferArrayConcat(as: ArrayBuffer[]): ArrayBuffer {
    const aLengths = as.reduce( (acc, a, i) => {
        return acc.concat( (acc[i - 1] || 0) + a.byteLength )
    }, [] as number[]) 
    const totalBytes = aLengths[aLengths.length - 1]

    const res = new Uint8Array(totalBytes)
    aLengths.forEach((_, aIndex, lengths) => {
        res.set(new Uint8Array(as[aIndex]), lengths[aIndex - 1] || 0)
    });
    return res
}