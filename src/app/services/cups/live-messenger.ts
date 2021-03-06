import { config } from '../../config'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { ContactWithMessageMeta, Contact, ServerMessage, ObservableOnce, mkSent, mkInbound } from './types'
import { CupsResParser, onionToPubkeyString, CupsMessageShow } from './cups-res-parser'
import { Observable, from, interval, race } from 'rxjs'
import { map, take, catchError } from 'rxjs/operators'
import { AuthState } from '../state/auth-state'
import { Log } from 'src/app/log'

export class LiveCupsMessenger {
    private readonly parser: CupsResParser = new CupsResParser()

    constructor(
      private readonly http: HttpClient,
      private readonly authState: AuthState,
    ) {}

    private authHeaders(password: string = this.authState.password): HttpHeaders {
        if (!password) {
            throw new Error('Unauthenticated request to server attempted.')
        }
        return new HttpHeaders({ Authorization: 'Basic ' + btoa(`me:${password}`) })
    }

    private get hostUrl(): string {
        return config.cupsMessenger.url
    }

    contactsShow(loginTestPassword: string): ObservableOnce<ContactWithMessageMeta[]> {
        return withTimeout(this.http.get(this.hostUrl, {
            params: {
                type: 'users',
                includeRecentMessages: '1'
            },
            headers: this.authHeaders(loginTestPassword),
            responseType: 'arraybuffer'
        }).pipe(
            catchError(e => {
                console.error('We have ourselves an error here...', e)
                console.error('We have ourselves an error here...', e.status)
                if(e.status === 401){ this.authState.logout$() }
                throw e
            })
        )).pipe(
                map(arrayBuffer =>
                    this.parser.deserializeContactsShow(arrayBuffer).map(
                        ({ contact, unreadMessages, lastMessages }) => 
                        ({...contact, unreadMessages, lastMessages: lastMessages.map(m => hydrateCupsMessageResponse(contact, m))})
                    )
                ),
                catchError( e => {
                    Log.error('Contacts show', e); throw e
                })
            )
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
                        subscriber.error(xhr)
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

    contactsDelete(contact: Contact): ObservableOnce<void> {
        const params = {
            type: 'user',
            pubkey: onionToPubkeyString(contact.torAddress),
        }

        return withTimeout(this.http.delete(this.hostUrl, {
            params,
            headers: this.authHeaders(),
            responseType: 'arraybuffer'
        })).pipe(map(() => {}))
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
                                                .map(m => hydrateCupsMessageResponse(contact, m))
                ),
                catchError(e => {
                    console.error('New messages show', JSON.stringify(e)); throw e
                })
            )
    }

    messagesSend(contact: Contact, trackingId: string, message: string): ObservableOnce<{}> {
        const toPost = this.parser.serializeSendMessage(contact.torAddress, trackingId, message)
        const headers = this.authHeaders()

        return new Observable(subscriber => {
            const xhr = new XMLHttpRequest()
            xhr.ontimeout = () => subscriber.error(new Error('TIMEOUT'))
            xhr.onload = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        subscriber.next({})
                    } else {
                        subscriber.error(xhr)
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


export function hydrateCupsMessageResponse(c: Contact, m : CupsMessageShow): ServerMessage {
    if(m.direction === 'Inbound'){
        return mkInbound({ ...m, direction: 'Inbound', otherParty: c})
    } else if (m.direction === 'Outbound') {
        return mkSent({ ...m, direction: 'Outbound', otherParty: c})
    }

    throw new Error(`Unexpected direction from server ${JSON.stringify(m)}`)
}


export function withTimeout<U>(req: Observable<U>, timeout: number = config.defaultServerTimeout): Observable<U> {
    return race(
        from(req),
        interval(timeout).pipe(map(() => { throw new Error('timeout') }))
    ).pipe(take(1))
}

export type ShowMessagesOptions = { limit?: number, offset?: { id: string, direction: 'before' | 'after' }}
export function fillDefaultOptions(options: ShowMessagesOptions): ShowMessagesOptions {
    const limit = options.limit || config.loadMesageBatchSize
    return { ...options, limit }
}
export type ShowNewMessagesOptions = { atLeast?: number }
export function fillNewDefaultOptions(options: ShowNewMessagesOptions): ShowNewMessagesOptions {
    const atLeast = options.atLeast || config.loadMesageBatchSize
    return { ...options, atLeast }
}