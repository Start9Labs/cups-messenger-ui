// export class CupsResParser {

// }

export function pullContact(arrayBuffer: ArrayBuffer): any {
    const pkey = arrayBuffer.slice(0, 0 + 32)
    const unreadsCount = arrayBuffer.slice(32, 32 + 8)
    const nameLength = arrayBuffer.slice(32 + 8, 32 + 8 + 1)
    const name = "jon"
    return { pkey, unreadsCount, nameLength, name }
}
