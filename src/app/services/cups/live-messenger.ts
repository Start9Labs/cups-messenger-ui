import { config } from '../../config'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { ContactWithMessageCount, Contact, ServerMessage, ObservableOnce } from './types'
import { CupsResParser, onionToPubkeyString } from './cups-res-parser'
import { Observable, from, interval, race } from 'rxjs'
import { map, take, catchError } from 'rxjs/operators'
import { Auth } from '../state/auth-state'

export class LiveCupsMessenger {
    private readonly parser: CupsResParser = new CupsResParser()

    constructor(private readonly http: HttpClient) {
        // tslint:disable-next-line: no-string-literal
        window['httpClient'] = http
    }

    private authHeaders(password: string = Auth.password): HttpHeaders {
        if (!password) {
            throw new Error('Unauthenticated request to server attempted.')
        }
        return new HttpHeaders({ Authorization: 'Basic ' + btoa(`me:${password}`) })
    }

    private get hostUrl(): string {
        return config.cupsMessenger.url
    }

    contactsShow(loginTestPassword: string): ObservableOnce<ContactWithMessageCount[]> {
        try {
            return withTimeout(this.http.get(this.hostUrl, {
                params: {
                    type: 'users'
                },
                headers: this.authHeaders(loginTestPassword),
                responseType: 'arraybuffer'
            })).pipe(
                    map(arrayBuffer => this.parser.deserializeContactsShow(arrayBuffer)),
                    catchError( e => { 
                        console.error('Contacts show', e); throw e 
                    })
                )
        }
        catch (e) {
            console.error('Contacts show', e)
            throw e
        }
    }

    contactsAdd(contact: Contact): ObservableOnce<void> {
        const toPost = this.parser.serializeContactsAdd(contact.torAddress, contact.name)
        const headers = this.authHeaders()

        return new Observable(subscriber => {
            const xhr = new XMLHttpRequest()
            xhr.ontimeout = () => subscriber.error(new Error('TIMEOUT'))
            xhr.onload = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        subscriber.next()
                    } else {
                        subscriber.error(new Error(xhr.statusText))
                    }
                }
            }

            xhr.timeout = config.defaultServerTimeout
            try{
                xhr.open('POST', this.hostUrl, true)
                xhr.setRequestHeader('Authorization', headers.get('Authorization'))
                xhr.send(toPost)
            } catch (e) {
                subscriber.error(e)
            }
        })
    }

    messagesShow(contact: Contact, options: ShowMessagesOptions): ObservableOnce<ServerMessage[]> {
        const { limit, offset } = fillDefaultOptions(options)
        const params = Object.assign({
            type: 'messages',
            pubkey: onionToPubkeyString(contact.torAddress),
            limit: String(limit),
        }, offset ? { [offset.direction]: offset.id } : {})

        return withTimeout(this.http.get(this.hostUrl, {
            params,
            headers: this.authHeaders(),
            responseType: 'arraybuffer'
        })).pipe(
                map( arrayBuffer =>  this.parser.deserializeMessagesShow(arrayBuffer)
                                                .map(m => ({ ...m, otherParty: contact }))
                ),
                catchError(e => {
                    console.error('New messages show', JSON.stringify(e)); throw e
                })
            )
    }

    newMessagesShow(contact: Contact): ObservableOnce<ServerMessage[]> {
        const params = {
            type: 'new',
            pubkey: onionToPubkeyString(contact.torAddress),
        }

        return withTimeout(this.http.get(this.hostUrl, {
            params,
            headers: this.authHeaders(),
            responseType: 'arraybuffer'
        })).pipe(
                map( arrayBuffer => this.parser.deserializeMessagesShow(arrayBuffer)
                                               .map(m => ({ ...m, otherParty: contact }))
                ),
                catchError(e => { 
                    console.error('New messages show', JSON.stringify(e)); throw e
                })
            )
    }

    messagesSend(contact: Contact, trackingId: string, message: string): ObservableOnce<{}> {
        const toPost = this.parser.serializeSendMessage(contact.torAddress, trackingId, message)
        const headers = this.authHeaders()
        // headers = headers.set('Content-Type', 'application/octet-stream')
        // headers = headers.set('Content-Length', toPost.byteLength.toString())
        // return withTimeout(this.http.post<void>(this.hostUrl, new Blob([toPost]), { headers })).toPromise()

        return new Observable(subscriber => {
            const xhr = new XMLHttpRequest()
            xhr.ontimeout = () => subscriber.error(new Error('TIMEOUT'))
            xhr.onload = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        subscriber.next({})
                    } else {
                        subscriber.error(new Error(xhr.statusText))
                    }
                }
            }

            xhr.timeout = config.defaultServerTimeout
            try{
                xhr.open('POST', this.hostUrl, true)
                xhr.setRequestHeader('Authorization', headers.get('Authorization'))
                xhr.send(toPost)
            } catch (e) {
                subscriber.error(e)
            }
        })
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