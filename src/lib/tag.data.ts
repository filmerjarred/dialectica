import autoBind from "auto-bind"
import { observable } from "mobx"
import { Record, Store } from "./makeStore"
import { tagInfo } from "./tagInfo"

export class TagRecord {
   // export class TagRecord extends Record<TagRecord> {
   id!: string
   tagType!: string
   hiddenOption!: boolean

   name?: string
   deprecated?: boolean

   @observable description!: string

   // boardUIData!: BoardUIData

   static defaults = {}
}

class TagStore {
   // class TagStore extends Store<typeof TagRecord, TagRecord> {
   tagTypes() {
      return tagInfo.tagTypes
   }

   tagTypeInfo() {
      return tagInfo.tagTypeInfo
   }

   tags(): TagRecord[] {
      return tagInfo.tags
   }

   tagsByIntention(cardIntentionTypeId: string) {
      const types = this.tagTypeInfo()
         .filter((t) => !t.intentionTypes || t.intentionTypes.includes(cardIntentionTypeId))
         .map((t) => t.tagTypeId)

      return this.tags().filter((t) => {
         return types.includes(t.tagType)
      })
   }

   tag(tagId: string) {
      const tag = this.tags().find((t) => t.id === tagId)

      if (!tag) throw new Error(`Could not find tag info for id "${tagId}"`)

      return tag
   }
}

export const tagStore = new TagStore()
// export const tagStore = new TagStore(TagRecord, "TagData").init()
