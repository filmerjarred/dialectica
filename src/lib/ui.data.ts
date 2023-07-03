// Get the imports
import { makeAutoObservable, observable, observe } from "mobx"
import { CardRecord, Side } from "./card.data"

export class UIStore {
   @observable contextMenuCard: CardRecord | null = null
   @observable showLog: boolean = false
   @observable showFeedback: boolean = false
   @observable showFinder: boolean = false

   // Explorer bar
   @observable showOnlyAnchors: boolean = true

   @observable hideInactiveTodo: boolean = false

   @observable showDiscussion: boolean = true

   @observable showRightClaims: boolean = true
   @observable showLeftClaims: boolean = true

   @observable showLeftTodo: boolean = true
   @observable showLeftOldDoneTodo: boolean = false

   @observable showLeftInbox: boolean = true
   @observable showLeftOldDoneInbox: boolean = false

   @observable showRightTodo: boolean = true
   @observable showRightOldDoneTodo: boolean = false

   @observable showRightInbox: boolean = true
   @observable showRightOldDoneInbox: boolean = false

   @observable showClaimsArchived: boolean = false
   @observable showDiscussionArchived: boolean = false

   toggleHideInactive() {
      this.hideInactiveTodo = !this.hideInactiveTodo
   }

   toggleShowOldDone(side: Side, inbox: boolean, state?: boolean) {
      if (side === Side.LEFT) {
         if (inbox) {
            this.showLeftOldDoneInbox = state !== undefined ? state : !this.showLeftOldDoneInbox
         } else {
            this.showLeftOldDoneTodo = state !== undefined ? state : !this.showLeftOldDoneTodo
         }
      } else {
         if (inbox) {
            this.showRightOldDoneInbox = state !== undefined ? state : !this.showRightOldDoneInbox
         } else {
            this.showRightOldDoneTodo = state !== undefined ? state : !this.showRightOldDoneTodo
         }
      }
   }

   getShowOldDone(side: Side, inbox: boolean) {
      if (side === Side.LEFT) {
         return inbox ? this.showLeftOldDoneInbox : this.showLeftOldDoneTodo
      } else {
         return inbox ? this.showRightOldDoneInbox : this.showRightOldDoneTodo
      }
   }

   toggleShowTodo(side: Side, state?: boolean) {
      if (side === Side.LEFT) {
         this.showLeftTodo = state !== undefined ? state : !this.showLeftTodo
      } else {
         this.showRightTodo = state !== undefined ? state : !this.showRightTodo
      }
   }

   getShowTodo(side: Side) {
      if (side === Side.LEFT) {
         return this.showLeftTodo
      } else {
         return this.showRightTodo
      }
   }

   toggleShowInbox(side: Side, state?: boolean) {
      if (side === Side.LEFT) {
         this.showLeftInbox = state !== undefined ? state : !this.showLeftInbox
      } else {
         this.showRightInbox = state !== undefined ? state : !this.showRightInbox
      }
   }

   getShowInbox(side: Side) {
      if (side === Side.LEFT) {
         return this.showLeftInbox
      } else {
         return this.showRightInbox
      }
   }

   toggleShowClaims(side: Side, state?: boolean) {
      if (side === Side.LEFT) {
         this.showLeftClaims = state !== undefined ? state : !this.showLeftClaims
      } else {
         this.showRightClaims = state !== undefined ? state : !this.showRightClaims
      }
   }

   getShowClaims(side: Side) {
      if (side === Side.LEFT) {
         return this.showLeftClaims
      } else {
         return this.showRightClaims
      }
   }

   toggleShowOnlyAnchors(state?: boolean) {
      this.showOnlyAnchors = state !== undefined ? state : !this.showOnlyAnchors
   }

   toggleShowDiscussion(state?: boolean) {
      this.showDiscussion = state !== undefined ? state : !this.showDiscussion
   }

   toggleShowDiscussionArchived(state?: boolean) {
      this.showDiscussionArchived = state !== undefined ? state : !this.showDiscussionArchived
   }

   toggleShowClaimsArchived(state?: boolean) {
      this.showClaimsArchived = state !== undefined ? state : !this.showClaimsArchived
   }

   setContextMenuCard(card: CardRecord | null) {
      this.contextMenuCard = card
   }

   toggleShowLog(state?: boolean) {
      this.showLog = state !== undefined ? state : !this.showLog
   }

   toggleShowFeedback(state?: boolean) {
      this.showFeedback = state !== undefined ? state : !this.showFeedback
   }

   toggleShowFinder(state?: boolean) {
      this.showFinder = state !== undefined ? state : !this.showFinder
   }

   constructor() {
      const existingConfig = localStorage.getItem("ui-store")
      if (existingConfig) {
         Object.assign(this, JSON.parse(existingConfig))
      }

      makeAutoObservable(this)

      const store = this
      observe(this, (change) => {
         const copy = { ...this, contextMenuCard: null }

         localStorage.setItem("ui-store", JSON.stringify(copy))
      })
   }
}

export const uiStore = new UIStore()
