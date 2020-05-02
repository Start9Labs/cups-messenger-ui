import { config } from '../../config'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { ContactWithMessageCount, Contact, ServerMessage } from './types'
import { CupsResParser, onionToPubkeyString } from './cups-res-parser'
import { globe } from '../global-state'
import { Observable, merge, from, interval, race } from 'rxjs'
import { map, take } from 'rxjs/operators'

export class LiveCupsMessenger {
    private readonly parser: CupsResParser = new CupsResParser()

    constructor(private readonly http: HttpClient) { }

    private authHeaders(password: string = globe.password): HttpHeaders {
        if (!password) {
            throw new Error('Unauthenticated request to server attempted.')
        }
        return new HttpHeaders({ Authorization: 'Basic ' + btoa(`me:${password}`) })
    }

    private get hostUrl(): string {
        return config.cupsMessenger.url
    }

    async contactsShow(loginTestPassword: string): Promise<ContactWithMessageCount[]> {
        try {
            return withTimeout(this.http.get(this.hostUrl, {
                params: {
                    type: 'users'
                },
                headers: this.authHeaders(loginTestPassword),
                responseType: 'arraybuffer'
            })).toPromise().then(arrayBuffer => this.parser.deserializeContactsShow(arrayBuffer))
        }
        catch (e) {
            console.error('Contacts show', e)
            throw e
        }
    }

    async contactsAdd(contact: Contact): Promise<void> {
        const toPost = this.parser.serializeContactsAdd(contact.torAddress, contact.name)
        const headers = this.authHeaders()
        headers.set('Content-Type', 'application/octet-stream')
        return withTimeout(this.http.post<void>(this.hostUrl, new Blob([toPost]), { headers })).toPromise()
    }

    async messagesShow(contact: Contact, options: ShowMessagesOptions): Promise<ServerMessage[]> {
        const { limit, offset } = fillDefaultOptions(options)
        const params = Object.assign({
            type: 'messages',
            pubkey: onionToPubkeyString(contact.torAddress),
            limit: String(limit),
        }, offset ? { [offset.direction]: offset.id } : {})
        try {
            const arrayBuffer = await withTimeout(this.http.get(this.hostUrl, {
                params,
                headers: this.authHeaders(),
                responseType: 'arraybuffer'
            })).toPromise()
            return this.parser.deserializeMessagesShow(arrayBuffer).map(m => ({ ...m, otherParty: contact }))
        }
        catch (e) {
            console.error('Messages show', e)
            console.error('Messages show', JSON.stringify(e))
            throw e
        }
    }

    async newMessagesShow(contact: Contact): Promise<ServerMessage[]> {
        const params = {
            type: 'new',
            pubkey: onionToPubkeyString(contact.torAddress),
        }
        try {
            const arrayBuffer = await withTimeout(this.http.get(this.hostUrl, {
                params,
                headers: this.authHeaders(),
                responseType: 'arraybuffer'
            })).toPromise()
            return this.parser.deserializeMessagesShow(arrayBuffer).map(m => ({ ...m, otherParty: contact }))
        }
        catch (e) {
            console.error('New messages show', e)
            console.error('New messages show', JSON.stringify(e))
            throw e
        }
    }

    async messagesSend(contact: Contact, trackingId: string, message: string): Promise<void> {
        const toPost = this.parser.serializeSendMessage(contact.torAddress, trackingId, message)
        try {
            const headers = this.authHeaders()
            headers.set('Content-Type', 'application/octet-stream')
            return withTimeout(this.http.post<void>(this.hostUrl, new Blob([toPost]), { headers })).toPromise()
        } catch (e) {
            console.error('messages send', e)
            throw e
        }
    }
}

export function withTimeout<U>(req: Observable<U>, timeout: number = config.defaultServerTimeout): Observable<U> {
    return race(
        from(req),
        interval(timeout).pipe(map(() => { throw new Error('timeout') }))
    ).pipe(take(1))
}

export type ShowMessagesOptions = { limit?: number, offset?: { id: string, direction: 'before' | 'after' } }
export function fillDefaultOptions(options: ShowMessagesOptions): ShowMessagesOptions {
    const limit = options.limit || config.loadMesageBatchSize
    return { ...options, limit }
}
export type ShowNewMessagesOptions = { atLeast?: number }
export function fillNewDefaultOptions(options: ShowNewMessagesOptions): ShowNewMessagesOptions {
    const atLeast = options.atLeast || config.loadMesageBatchSize
    return { ...options, atLeast }
}