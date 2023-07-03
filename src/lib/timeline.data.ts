import { Record, Store } from "./makeStore"
import { observable } from "mobx"

export class TimelineRecord extends Record<TimelineRecord> {
   time!: number

   publishingUserId!: string
   partnerUserId!: string

   @observable boardId!: string

   data!: string

   static defaults = {}

   getChunks(): TimelineDataChunk[] {
      return JSON.parse(this.data)
   }
}

export interface TimelineDataChunk {
   cardId: string

   oldTitle: string
   newTitle: string | null

   oldText: string
   newText: string | null
}

class TimelineStore extends Store<typeof TimelineRecord, TimelineRecord> {
   @observable currentFocused: TimelineRecord | null = null
}

export const timelineStore = new TimelineStore(TimelineRecord, "TimelineData").init()
