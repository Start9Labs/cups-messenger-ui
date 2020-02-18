import { interval, Observable, BehaviorSubject, merge, Subject } from 'rxjs'
import { mergeMap } from 'rxjs/operators'
import { CupsMessenger } from '../cups/cups-messenger'
import { Contact, ServerMessage, ContactWithMessageCount } from '../cups/types'

export interface PyroDaemonConfig { frequency: number, cups: CupsMessenger, contact: Contact }
export const $pyroManual = new BehaviorSubject({})
export const pyroProvider: (p: PyroDaemonConfig) => Observable<ServerMessage[]> = ({frequency, cups, contact}) =>
            merge(
                interval(frequency), $pyroManual
            ).pipe(
                mergeMap(() => cups.messagesShow(contact)),
            )

export interface CryoDaemonConfig { frequency: number, cups: CupsMessenger }
export const $cryoManual = new BehaviorSubject({})
export const cryoProvider: (p: CryoDaemonConfig) => Observable<ContactWithMessageCount[]> = ({frequency, cups}) =>
            merge(
                interval(frequency), $cryoManual
            ).pipe(
                mergeMap(() => cups.contactsShow().handle(console.error)),
            )


