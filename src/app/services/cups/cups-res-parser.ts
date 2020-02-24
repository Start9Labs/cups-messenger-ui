import * as base32 from 'base32.js'
import * as h from 'js-sha3'
import { ContactWithMessageCount, MessageDirection } from './types'
import * as uuidv4 from 'uuid/v4'

const utf8Decoder = new TextDecoder()
const utf8Encoder = new TextEncoder()

interface CupsMessageShow { text: string, timestamp: Date, direction: MessageDirection, id: string, trackingId: string }
export class CupsResParser {
    constructor() {}

    deserializeContactsShow(rawRes: ArrayBuffer): ContactWithMessageCount[] {
        const p = new ArrayBufferParser(rawRes)
        if (p.isEmpty) { return [] }
        const toReturn = []
        while (!p.isEmpty) {
            try {
                toReturn.push(pullContact(p))
            } catch (e) {
                console.error(`Contact parsing error ${e}`)
                break
            }
        }
        return toReturn
    }

    deserializeMessagesShow(rawRes: ArrayBuffer): CupsMessageShow[] {
        const p = new ArrayBufferParser(rawRes)
        if (p.isEmpty) { return [] }
        const toReturn = []
        while (!p.isEmpty) {
            try {
                toReturn.push(pullMessage(p))
            } catch (e) {
                console.error(`Message parsing error ${e}`)
                break
            }
        }
        return toReturn
    }

    serializeContactsAdd(torAddress: string, name: string): ArrayBuffer {
        const torBytes = onionToPubkey(torAddress)
        const nameBytes = utf8Encoder.encode(name)
        return bufferArrayConcat([new Uint8Array([1]).buffer, torBytes, nameBytes])
    }

    // 0x00 <Tracking ID (UUID BE)> <ED25519 PubKey of Recipient (32 bytes)> <UTF-8 Encoded Message>
    serializeSendMessage(torAddress: string, trackingId: string, message: string): ArrayBuffer {
        const torBytes = onionToPubkey(torAddress)
        const messageBytes = utf8Encoder.encode(message)
        return bufferArrayConcat([new Uint8Array([0]).buffer, hexToBytes(trackingId.split('-').join('')), torBytes, messageBytes])
    }

}

class ArrayBufferParser {
    private buffer: ArrayBuffer
    constructor(buffer: ArrayBuffer | undefined) {
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
        this.buffer = this.buffer.slice(i)
        return callback(res)
    }
}

const PKEY_LENGTH = 32
const UNREADS_LENGTH = 8
const NAME_LENGTH = 1
function pullContact(p: ArrayBufferParser): ContactWithMessageCount {
    const torAddress     = p.chopNParse(PKEY_LENGTH   , pubkeyToOnion)
    const unreadsCount   = p.chopNParse(UNREADS_LENGTH, bigEndian)
    const nameSize       = p.chopNParse(NAME_LENGTH   , bigEndian)
    const name           = p.chopNParse(nameSize      , utf8Decoder.decode)
    return { torAddress, unreadMessages: unreadsCount, name }
}

function pullMessage(p: ArrayBufferParser): CupsMessageShow {
    const direction      = p.chopNParse(1, byteToMessageDirection)
    const trackingId     = p.chopNParse(16, bytesToUuid)
    const id             = p.chopNParse(8, bigEndian)
    const epochTime      = p.chopNParse(8, bigEndian)
    const messageLength  = p.chopNParse(8, bigEndian)
    const text           = p.chopNParse(messageLength, utf8Decoder.decode)
    return { direction, timestamp: new Date(epochTime * 1000), text, id: String(id), trackingId }
}

function pubkeyToOnion(pubkey: ArrayBuffer) {
    if (pubkey.byteLength !== 32) {
        throw new Error('Invalid pubkey length')
    }

    const hasher = h.sha3_256.create()
    hasher.update('.onion checksum')
    hasher.update(pubkey)
    hasher.update([3])
    const checksum = hasher.arrayBuffer().slice(0, 2)

    const res = bufferArrayConcat([pubkey, checksum, new Uint8Array([3])])

    return new base32.Encoder({ type: 'rfc4648', lc: true }).write(res).finalize() + '.onion'
}

export function onionToPubkey(onion: string): ArrayBuffer {
    const s = onion.split('.')[0].toUpperCase()

    const decoded = new Uint8Array(new base32.Decoder({ type: 'rfc4648', lc: true }).write(s).finalize())

    if (decoded.byteLength > 35) {
        throw new Error('Invalid base32 length.')
    }
    if (decoded[34] !== 3) {
        throw new Error('Invalid version')
    }
    const pubkey = decoded.slice(0, PKEY_LENGTH)

    const hasher = h.sha3_256.create()
    hasher.update('.onion checksum')
    hasher.update(pubkey)
    hasher.update([3])

    const checksum = new Uint8Array(hasher.arrayBuffer().slice(0, 2))
    const oldChecksum = decoded.slice(PKEY_LENGTH, PKEY_LENGTH + 2 )

    if (!checksum.every( (x, i) => x === oldChecksum[i] )) {
        throw new Error ('Invalid checksum')
    }
    return pubkey
}

export function onionToPubkeyString(onion: string): string {
    const arrayBuffer = onionToPubkey(onion)
    return new base32.Encoder({ type: 'rfc4648', lc: true }).write(arrayBuffer).finalize()
}

function bigEndian(arrayBuffer: ArrayBuffer): number {
    return new Uint8Array(arrayBuffer).reverse().reduce( (acc, next, index) => {
        return acc + next * 256 ** index
    }, 0)
}

function byteToMessageDirection(a: ArrayBuffer): MessageDirection {
    if (a.byteLength !== 1) {
        throw new Error (`invalid message direction`)
    }

    if (new Uint8Array(a)[0] === 0) {
        return 'Outbound'
    } else if (new Uint8Array(a)[0] === 1) {
        return 'Inbound'
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
    })
    return res
}


const byteToHex = []
for (let i = 0; i < 256; ++i) {
    byteToHex[i] = (i + 0x100).toString(16).substr(1)
}

function bytesToUuid(buf: ArrayBuffer, offset = 0) {
    let i = offset
    const bth = byteToHex
    // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
    return ([
        bth[buf[i++]], bth[buf[i++]],
        bth[buf[i++]], bth[buf[i++]], '-',
        bth[buf[i++]], bth[buf[i++]], '-',
        bth[buf[i++]], bth[buf[i++]], '-',
        bth[buf[i++]], bth[buf[i++]], '-',
        bth[buf[i++]], bth[buf[i++]],
        bth[buf[i++]], bth[buf[i++]],
        bth[buf[i++]], bth[buf[i++]]
    ]).join('')
}

function hexToBytes(str: string): ArrayBuffer {
    const result = []
    while (str.length >= 8) {
        result.push(parseInt(str.substring(0, 8), 16))
        str = str.substring(8, str.length)
    }

    return new Uint8Array(result).buffer
}
