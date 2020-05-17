import { onionToPubkeyString } from './services/cups/cups-res-parser'

export function sanitizeOnion(unsanitizedOnion: string): string {
    const removeProtocol = unsanitizedOnion.trim().split('//')[1] || unsanitizedOnion
    const sanitizedOnion = removeProtocol.split('.onion')[0].concat('.onion')

    try {
        onionToPubkeyString(sanitizedOnion)
    } catch (e) {
        throw new Error(`Invalid Cups Tor Address.`)
    }
    return sanitizedOnion
}

export function sanitizeName(unsanitizedName: string): string {
    const sanitizedName = unsanitizedName.trim()
    if (sanitizedName.length > 255) {
        throw new Error(`Name must be less than 255 characters.`)
    } else if (sanitizedName.length <= 0) {
        throw new Error(`Name cannot be empty.`)
    }
    return sanitizedName
}

export function ensureNewTor(preexistingContacts, sanitizedOnion): string {
    const preexisting = preexistingContacts.find(c => c.torAddress === sanitizedOnion)
    if(preexisting){
        throw new Error(`Contact ${preexisting.name} already has that tor address.`)
    }
    return sanitizedOnion
}