// Get the imports

import { observable } from "mobx"
import { Store, Record } from "./makeStore"
import _ from "lodash"

export class MessageRecord extends Record<MessageRecord> {
   @observable text!: string
   @observable userId!: string
   @observable time!: number
   @observable boardId!: string

   static defaults = {}
}

class MessageStore extends Store<typeof MessageRecord, MessageRecord> {}

export const messageStore = new MessageStore(MessageRecord, "MessageData").init()
