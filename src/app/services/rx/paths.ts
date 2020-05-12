import { config } from 'src/app/config'
import { CupsMessenger } from '../cups/cups-messenger'
import { PartialObserver, Subject } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { RefreshContacts } from '../state-ingestion/contacts-ingestion'
import { RefreshMessages } from '../state-ingestion/messages-ingestion'
import { State } from '../state/contact-messages-state'
import { cooldown, at } from '../state-ingestion/util'
import { Contact } from '../cups/types'


export function main(cups: CupsMessenger): {
    $refreshContactsTrigger: PartialObserver<{}>,
    $refreshMessagesTrigger: PartialObserver<Contact>,
} {
    // State will alway ingests new contacts emitted by calling next on the trigger.
    const $refreshContactsTrigger$ = RefreshContacts.path(cups)
    $refreshContactsTrigger$.subscribe(State.$ingestContacts)

    // State will alway ingests new contacts emitted on cooldown.
    cooldown(config.contactsDaemon.frequency, RefreshContacts.path(cups)).subscribe(State.$ingestContacts)

    // State will alway ingests new messages emitted by calling next on the trigger with a given contact.
    const $refreshMessagesTrigger$ =  RefreshMessages.path(cups)
    $refreshMessagesTrigger$.subscribe(State.$ingestMessages)

    // State will alway ingests new messages emitted on cooldown.
    // Everytime we change currentContact, the cooldown process targets the messages of this new contact.
    State.emitCurrentContact$.pipe(
        concatMap(contact =>
            cooldown(config.contactsDaemon.frequency, at(contact, RefreshMessages.path(cups)))
        )
    ).subscribe(State.$ingestMessages)

    return {
        $refreshContactsTrigger: $refreshContactsTrigger$,
        $refreshMessagesTrigger: $refreshMessagesTrigger$
    }
}