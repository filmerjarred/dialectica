import autoBind from "auto-bind"
import { computed, observable } from "mobx"
import { Record, Store } from "./makeStore"
import { getUser } from "./useUser"
import { boardStore } from "./board.data"

export interface BoardUIData {
   focusedCardId: string
   focusedElement: "text" | "title" | null
   setPosition?: number
}

export interface HelpUIData {
   collapsedSections: string[]
   scrollHeight: number
}

export class UserRecord extends Record<UserRecord> {
   @observable pic!: string

   @observable uiShowTimeline!: boolean
   @observable uiShowMessages!: boolean
   @observable uiShowOwnerExplorer!: boolean
   @observable uiShowPartnerExplorer!: boolean
   @observable uiShowHelp!: boolean

   @observable receiveEmailsOnPublish!: boolean

   @observable.shallow helpUIData!: HelpUIData

   // boardUIData!: BoardUIData

   static defaults = {
      uiShowTimeline: false,
      uiShowHelp: true,
      uiShowMessages: false,
      receiveEmailsOnPublish: true,

      uiShowOwnerExplorer: false,
      uiShowPartnerExplorer: false,

      helpUIData: {
         collapsedSections: [],
         scrollHeight: 0,
      },
   }

   // updateBoardUIData(data: Partial<BoardUIData>) {
   //    const board = boardStore.currentBoard!

   //    const key = `boardUIData.${board.id}`

   //    ;(this ).update({ [key]: { ...this.currentBoardUIData, ...data } })
   // }

   // get currentBoardUIData() {
   //    const uiData = this.boardUIData[boardStore.currentBoard?.id!]
   //    if (!uiData) throw new Error("Could not find ui data for user + board")

   //    return uiData
   // }

   @computed
   get isSpectator() {
      return (
         !boardStore.currentSelected?.userIds.includes(this.id) &&
         boardStore.currentSelected?.spectatorUserIds.includes(this.id)
      )
   }

   toggleShowHelp() {
      this.update({ uiShowHelp: !this.uiShowHelp })
   }

   toggleShowTimeline() {
      this.update({ uiShowTimeline: !this.uiShowTimeline })
   }

   constructor() {
      super()
      autoBind(this)
   }
}

class UserStore extends Store<typeof UserRecord, UserRecord> {
   getUserRecord() {
      const user = getUser()
      const userRecord = this.records.get(user.uid)

      if (!userRecord) throw new Error("could not find user record")

      return userRecord
   }
}

export const userStore = new UserStore(UserRecord, "UserData").init()
