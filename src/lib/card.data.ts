// Get the imports

import { boardStore } from "./board.data"
import { action, comparer, computed, makeAutoObservable, makeObservable, observable, observe, runInAction } from "mobx"
import { Store, Record } from "./makeStore"
import _ from "lodash"
import { getUser } from "./useUser"
import { UserRecord, userStore } from "./user.data"
import autoBind from "auto-bind"
import { query, where } from "firebase/firestore"
import { lexicalToText } from "./lexicalToText"
import { TodoRecord, todoStore } from "./todo.data"
import { makeLexicalWikilink } from "../components/Todo"
import { toast } from "react-toastify"
import { LexicalEditor } from "lexical"
import { tagInfo } from "./tagInfo"
import { tagStore } from "./tag.data"
import { cardIntentionStore } from "./cardIntention.data"

export const oppositeSide = (side: Side) => (side === Side.LEFT ? Side.RIGHT : Side.LEFT)
export enum Side {
   LEFT = "LEFT",
   RIGHT = "RIGHT",
   TOP = "TOP",
}

export enum CardLocationType {
   DISCUSSION = "DISCUSSION",
   POSITION = "POSITION",
   PARAGRAPH = "PARAGRAPH",
}

// what medium is the content
export enum CardMediumType {
   FREE_TEXT = "FREE_TEXT",
   SQUIGGLE = "SQUIGGLE",
   MANIFOLD = "MANIFOLD",
}

export function toUpperFirst(tag: string) {
   return _.upperFirst(tag.toLowerCase())
}

export interface GutterItem {
   cardId: string
   order: number
   textCollapsed?: boolean
}

interface CardUserData {
   isHidden: boolean
   leftGutterItems: GutterItem[]
   rightGutterItems: GutterItem[]
}

export class LexicalParagraphData {
   id: string
   editorId?: string

   @observable paragraphHeight?: number
   @observable paragraphY?: number

   @observable relatedCardsHeight?: number

   constructor(id: string, editorId: string) {
      this.id = id
      this.editorId = editorId
   }
}

export class CardRecord extends Record<CardRecord> {
   @observable oldTitle!: string
   @observable updatedTitle!: string | null

   @observable oldText!: string
   @observable updatedText!: string | null

   @observable boardId!: string

   // Which user's tree
   @observable treeUserId!: string

   // types
   /**
    * @deprecated in favour of cardLocationType
    */
   @observable type?: CardLocationType
   @observable cardLocationType!: CardLocationType

   /**
    * @deprecated in favour of cardMediumType
    */
   @observable cardType?: CardMediumType
   @observable cardMediumType!: CardMediumType

   @observable cardIntentionTypeId!: string | null

   @observable ultraZen?: boolean
   @observable exploded?: boolean

   @observable isAgreed!: boolean

   @observable isProvisionallyAgreed!: boolean
   @observable isCentralPosition!: boolean

   @observable isArchived!: boolean

   @observable squiggleCode?: string
   @observable manifoldUrl?: string

   @observable order!: number
   @observable parentId!: string | null

   @observable.shallow ownerTagIds!: string[]
   @observable.shallow partnerTagIds!: string[]

   // Whether the owner wants the card to be seen by others
   @observable ownerWantsShown!: boolean
   // Whether the partner wants it shown
   @observable partnerWantsShown!: boolean

   // Whether there is an unrevealed update
   @observable unrevealedUpdate!: boolean

   @observable ownerUserId!: string

   @observable paragraphId!: string | null
   @observable paragraphParentCardId!: string | null

   @observable.deep userDataObjects!: {
      [i: string]: CardUserData
   }

   @observable.deep local!: {
      paragraphHeight?: number
      paragraphY?: number
      cardHeight?: number

      lexicalParagraphs: LexicalParagraphData[]

      ref?: React.LegacyRef<HTMLDivElement>

      shouldFocusCursor: "text" | "title" | false // if true card will draw cursor focus when rendering
      cursorFocusPosition?: number
      shouldCenterScreen?: boolean // if true card will draw screen focus when rendering using panzoom

      relatedCollapsed: boolean
      textCollapsed: boolean
      explorerRelatedCollapsed: boolean

      draggedTodo?: TodoRecord
   }

   /* "Focusing" a card can involve whether or not to:


         and

      (- center the screen on it
         or
         - focus the cursor
         or
      - and later, whether to zen mode on it)
   */

   // draw the blue border and highlight it in the card explorer
   // ensure parents are displayed even if archived or hidden
   @computed get isSelected() {
      return cardStore.currentSelected === this
   }

   @computed get isHotseat() {
      return cardStore.currentHotseat === this
   }

   localNonObserved!: {
      ref?: React.LegacyRef<HTMLDivElement>
      lexicalEditor?: LexicalEditor
   }

   static defaults = {
      cardMediumType: CardMediumType.FREE_TEXT,
      cardIntentionTypeId: "BLANK",
      cardLocationType: CardLocationType.POSITION,

      squiggleCode: "normal(5,2)",

      shouldPanTo: false,

      tagLine: "",

      oldTitle: "",
      updatedTitle: null,

      isAgreed: false,
      isProvisionallyAgreed: false,
      isCentralPosition: false,

      isArchived: false,

      ownerWantsShown: false,
      partnerWantsShown: false,

      unrevealedUpdate: false,

      acknowledged: false,

      ownerTagIds: [],
      partnerTagIds: [],

      userDataObjects: {},

      oldText: JSON.stringify({
         root: {
            children: [
               {
                  children: [{ detail: 0, format: 0, mode: "normal", style: "", text: "", type: "text", version: 1 }],
                  direction: "ltr",
                  format: "",
                  indent: 0,
                  type: "paragraph",
                  version: 1,
               },
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "root",
            version: 1,
         },
      }),
      updatedText: null,

      local: {
         lexicalParagraphs: [],
         isFocused: false,
         focusedElement: null,
         decorators: [],
      },
      localNonObserved: {
         decorators: [],
      },
   }

   static mappings = {
      cardType: "cardMediumType",
      type: "cardLocationType",
      ownerTags: "ownerTagIds",
      partnerTags: "partnerTagIds",
   }

   constructor() {
      super()
      autoBind(this)
   }

   // ==== COMPUTED RELATIONSHIP Functions ======

   @computed
   get board() {
      const board = boardStore.records.get(this.boardId)
      if (!board) throw new Error("could not find board for card")
      return board
   }

   //---------------

   @computed
   get parent(): CardRecord | null {
      if (this.parentId) return cardStore.records.get(this.parentId) || null
      return null
   }

   @computed
   get paragraphParent(): CardRecord | null {
      if (this.paragraphParentCardId) return cardStore.records.get(this.paragraphParentCardId) || null
      return null
   }

   @computed.struct
   get roots() {
      return (
         _(Array.from(this.board.cards))
            // all other Todos on the same board and side with no parents
            .filter(
               (card) =>
                  !card.parentId &&
                  card.boardId === this.boardId &&
                  card.side === this.side &&
                  card.cardLocationType === this.cardLocationType
            )
            .sortBy((d) => d.order)
            .value()
      )
   }

   @computed get relatedParagraphCards() {
      return _(this.board.cards)
         .filter((card) => card.paragraphParentCardId === this.id)
         .value()
   }

   @computed get lexicalParagraphsWithCards() {
      const relatedParagraphCards = this.relatedParagraphCards

      return this.local.lexicalParagraphs.flatMap((p) => {
         if (p.editorId !== this.localNonObserved.lexicalEditor?._config.theme.id) return []

         const cards = relatedParagraphCards.filter((c) => c.show && c.paragraphId === p.id)
         if (!cards.length) return []
         else return [{ paragraph: p, cards }]
      })
   }

   @computed.struct
   get children() {
      return _(this.board.cards)
         .filter((card) => card.parentId === this.id && card.cardLocationType === this.cardLocationType)
         .sortBy((c) => c.order)
         .value()
   }

   @computed.struct
   get peersAndMe() {
      if (this.cardLocationType === CardLocationType.PARAGRAPH && !this.parent) {
         if (!this.paragraphParent) throw new Error("paragraph card has no parent")

         return this.paragraphParent.relatedParagraphCards.filter((c) => c.paragraphId === this.paragraphId)
      } else {
         if (!this.parent) {
            return this.roots
         } else {
            return this.parent.children
         }
      }
   }

   @computed.struct
   get peers() {
      return this.peersAndMe.filter((c) => c.id !== this.id)
   }

   //---------------

   /**
    * Starts at 1
    */
   get depth() {
      let x = 1
      let parent = this.parent as CardRecord
      while (parent) {
         x++
         parent = parent.parent as CardRecord
      }
      return x
   }

   @computed get side() {
      if (this.cardLocationType === CardLocationType.DISCUSSION) return Side.LEFT
      if (this.cardLocationType === CardLocationType.PARAGRAPH) return Side.LEFT

      return this.board.local.leftUserId === this.treeUserId ? Side.LEFT : Side.RIGHT
   }

   @computed get isMine() {
      return getUser().uid === this.ownerUserId
   }

   @computed get hasUnpublishedChanges() {
      const unpublishedUpdate = !this.unrevealedUpdate && (this.updatedText || this.updatedTitle)

      return !this.ownerWantsShown || unpublishedUpdate
   }

   @computed
   get ancestorCentralPositions(): CardRecord[] {
      return allAncestors(this, (p) => (p.isCentralPosition ? p : null)).filter((x) => x) as CardRecord[]
   }

   @computed
   get todos(): TodoRecord[] {
      return this.board.todos.filter((t) => t.cards.includes(this))
   }

   @computed
   get myUserData() {
      return this.getUserData(userStore.getUserRecord())
   }

   @computed
   get partnerUserData() {
      return this.getUserData(this.board.partner!)
   }

   @computed
   get leftUser() {
      return userStore.records.get(this.ownerUserId)!
   }
   @computed
   get leftUserData() {
      return this.getUserData(this.leftUser)
   }

   @computed
   get rightUser() {
      const rightUserId = this.board.userIds.find((id) => id !== this.ownerUserId)!
      return userStore.records.get(rightUserId) || null
   }

   @computed
   get rightUserData() {
      return this.getUserData(this.rightUser)
   }

   @computed
   get title() {
      return (this.isMine && this.updatedTitle !== null ? this.updatedTitle : this.oldTitle) || this.updatedTitle || ""
   }

   @computed
   get text() {
      return this.isMine && this.updatedText !== null ? this.updatedText : this.oldText
   }

   @computed
   get plainText() {
      return lexicalToText(this.text)
   }

   // whether or not card is an ancestor of this
   hasAncestor(card: CardRecord) {
      let parent = this.parent as CardRecord
      while (parent) {
         if (parent === card) {
            return true
         }
         parent = parent.parent as CardRecord
      }
      return false
   }

   updateTags(tagId: string) {
      const card = this

      const key = card.isMine ? "ownerTagIds" : "partnerTagIds"

      const cardTagIds = card[key]

      const info = tagStore.tag(tagId)

      const newOwnerTags = (() => {
         // remove
         if (cardTagIds.includes(tagId as any)) return _.without(cardTagIds, tagId)

         // replace
         const typeMatch = cardTagIds.find((tagId) => info.tagType === tagStore.tag(tagId).tagType)
         if (typeMatch) return [..._.without(cardTagIds, typeMatch), tagId]

         // add
         return [...cardTagIds, tagId]
      })()

      let updateData = { [key]: newOwnerTags }

      card.update(updateData)
   }

   toggleIsAgreed() {
      if (!this.isMine) {
         this.update({ isAgreed: !this.isAgreed })
      }
   }

   toggleIsProvisionallyAgreed() {
      if (!this.isMine) {
         this.update({ isProvisionallyAgreed: !this.isProvisionallyAgreed })
      }
   }

   toggleIsCentralPosition() {
      if (this.isMine) {
         this.update({ isCentralPosition: !this.isCentralPosition })
      }
   }

   toggleRelated(val?: boolean) {
      this.updateLocal({
         relatedCollapsed: val === undefined ? !this.local.relatedCollapsed : val,
      })
   }

   toggleTextCollapsed(val?: boolean) {
      this.updateLocal({
         textCollapsed: val === undefined ? !this.local.textCollapsed : val,
      })
   }

   toggleHide() {
      const card = this

      if (
         cardStore.currentSelected &&
         !this.myUserData.isHidden &&
         (cardStore.currentSelected === card || cardStore.currentSelected.hasAncestor(card))
      ) {
         cardStore.setSelected(null)
      }

      this.updateUserData(userStore.getUserRecord(), {
         isHidden: !this.myUserData.isHidden,
      })

      card.focusOnRemove()
   }

   toggleArchived() {
      if (!this.isMine) return

      const card = this
      if (!this.parent && !this.peers.length) return

      if (!this.isArchived && cardStore.currentSelected === card) {
         card.focusOnRemove()
      }

      this.update({ isArchived: !this.isArchived })
   }

   // Data corresponding to the logged in
   getUserData(user: UserRecord | null): CardUserData {
      if (user && this.userDataObjects && this.userDataObjects[user.id]) {
         return this.userDataObjects[user.id]
      } else {
         return {
            isHidden: false,
            leftGutterItems: [],
            rightGutterItems: [],
         }
      }
   }

   @action
   updateUserData(user: UserRecord, userData: Partial<CardUserData>) {
      const newData = Object.assign({}, this.getUserData(user), userData)
      const key = `userDataObjects.${user.id}`

      this.userDataObjects[user.id] = newData
      this.update({ [key]: newData })
   }

   remove() {
      const card = this
      if (this.cardLocationType !== CardLocationType.PARAGRAPH && !this.parent && !this.peers.length) return

      if (cardStore.currentSelected === card) {
         card.focusOnRemove()
      }

      if (this.cardLocationType === CardLocationType.PARAGRAPH) {
         const paragraphData = this.paragraphParent?.lexicalParagraphsWithCards.find(
            (p) => p.paragraph.id === this.paragraphId
         )?.paragraph
         this.delete()
         if (paragraphData) {
            runInAction(() => {
               paragraphData.relatedCardsHeight = 0
            })
         }
      } else {
         this.delete()
      }

      this.reconcilePeerOrder()
   }

   @action
   updateLocal(update: Partial<CardRecord["local"]>) {
      Object.assign(this.local, update)
   }

   // ==== UI Functions ======

   getGutterItems(side: Side): GutterItem[] {
      if (side === Side.LEFT) return this.myUserData.leftGutterItems || []
      else return this.myUserData.rightGutterItems || []

      // return (side === Side.LEFT ? this.myUserData.leftGutterItems  ) || []
   }

   addToGutter(side: Side, itemOrCard: GutterItem | CardRecord) {
      console.log("addToGutter", itemOrCard)
      const items = this.getGutterItems(side)

      if (itemOrCard instanceof CardRecord) {
         itemOrCard = { cardId: itemOrCard.id, order: items.length }
      }

      const item = itemOrCard as GutterItem

      if (item.cardId === this.id) {
         toast("Cannot add self")
         return
      }

      if (items.find((i) => i.cardId === item.cardId)) {
         toast("Item already in gutter")
         return
      }

      items.splice(item.order, 0, item)
      this.setGutter(side, items)
   }

   removeFromGutter(side: Side, item: GutterItem) {
      const items = this.getGutterItems(side).filter((i) => i.cardId !== item.cardId)
      this.setGutter(side, items)
   }

   @action
   updateGutterItem(side: Side, item: GutterItem, update: Partial<GutterItem>) {
      console.log("updateGutterItem", item, update)
      const oldItems = this.getGutterItems(side)

      let items = oldItems

      if (update.order !== undefined) {
         items = oldItems.filter((i) => i.cardId !== item.cardId)
         items.splice(update.order, 0, item)
      }

      console.log(items.includes(item))

      Object.assign(item, update)

      this.setGutter(side, items)
   }

   @action
   setGutter(side: Side, items: GutterItem[]) {
      console.log("setGutter", items)
      const user = userStore.getUserRecord()
      items.forEach((item, i) => {
         item.order = i
      })

      if (side === Side.LEFT) this.updateUserData(user, { leftGutterItems: items })
      if (side === Side.RIGHT) this.updateUserData(user, { rightGutterItems: items })
   }

   @action
   focusCursor(element?: "text" | "title", position?: number) {
      cardStore.setSelected(this)

      if (this.local.textCollapsed) {
         this.toggleTextCollapsed(false)
      }

      const defaultSelection = this.cardLocationType === CardLocationType.PARAGRAPH ? "text" : "title"

      this.local.shouldFocusCursor = element || defaultSelection
      this.local.cursorFocusPosition = position
      return this
   }

   @action
   centerOnScreen() {
      window.history.pushState(this.id, "")
      cardStore.setSelected(this)
      this.local.shouldCenterScreen = true
      if (this.plainText.length) {
         this.updateLocal({ textCollapsed: false })
      }

      return this
   }

   focusOnRemove() {
      // cardStore.setSelected(null)
      if (!this.peers.length && this.parent) {
         this.parent!.focusCursor()
      } else {
         const peer = this.nextPeer() || this.previousPeer()

         if (peer) {
            peer.focusCursor()
         }
      }
   }

   todo() {
      const user = getUser()

      todoStore.create({
         boardId: this.boardId,
         createdByUserId: user.uid,
         isHeader: false,
         isInInbox: true,
         order: this.board.userInboxRoots.length,
         parentId: null,
         userId: user.uid,
         title: makeLexicalWikilink({ card: this }),
      })
   }

   @computed
   get show() {
      const card = this

      const cardOrDescendentSelected =
         card.isSelected ||
         cardStore.currentSelected?.hasAncestor(this) ||
         cardStore.currentSelected?.paragraphParent === card ||
         cardStore.currentSelected?.paragraphParent?.hasAncestor(this)

      // If it belongs to the logged in user then show it
      if (this.isArchived || this.myUserData.isHidden || this.parent?.local.relatedCollapsed) {
         return !!cardOrDescendentSelected
      }

      if (this.isMine) return true

      return this.ownerWantsShown && this.partnerWantsShown
   }

   newPeer(data?: Partial<CardRecord>) {
      const user = getUser()

      const cardIntentionTypeId =
         this.cardLocationType === CardLocationType.PARAGRAPH && !this.parentId ? "PARAPHRASE" : null

      const newCard = cardStore.create({
         order: this.order + 1,
         parentId: this.parentId,
         boardId: this.boardId,
         ownerUserId: user.uid,
         treeUserId: this.treeUserId,
         paragraphId: this.paragraphId || null,
         paragraphParentCardId: this.paragraphParentCardId || null,

         cardMediumType: this.cardMediumType,
         cardLocationType: this.cardLocationType || CardLocationType.POSITION,
         cardIntentionTypeId: cardIntentionTypeId,
         ...data,
      })

      if (data?.order !== undefined) {
         this.reconcilePeerOrder()
      }

      return newCard
   }

   newRelated(data?: Partial<CardRecord>) {
      const user = getUser()

      const newCard = cardStore.create({
         order: 0,
         parentId: this.id,
         boardId: this.boardId,
         ownerUserId: user.uid,
         treeUserId: this.treeUserId,

         cardMediumType: this.cardMediumType,
         cardLocationType: this.cardLocationType || CardLocationType.POSITION,
         cardIntentionTypeId: null,

         paragraphId: null,
         paragraphParentCardId: this.paragraphParentCardId || null,

         ...data,
      })

      newCard.reconcilePeerOrder()

      return newCard
   }

   reconcilePeerOrder() {
      _(this.peersAndMe)
         .sortBy((c) => c.order)
         .forEach((card, index) => {
            if (card.order !== index) {
               card.update({ order: index })
            }
         })
   }

   previousPeer(): CardRecord | null {
      const peer = this.order !== 0 ? this.peers.find((p) => p.order === this.order - 1)! : null

      if (!peer) return null

      if (peer.show) {
         return peer
      } else {
         return peer.previousPeer()
      }
   }

   nextPeer(): CardRecord | null {
      const peer = this.order === this.peers.length ? null : this.peers.find((p) => p.order === this.order + 1)!

      if (!peer) return null

      if (peer.show) {
         return peer
      } else {
         return peer.nextPeer()
      }
   }

   focusUp() {
      if (this.parent?.local.relatedCollapsed) this.parent.toggleRelated(false)

      const peer = this.previousPeer() || this.newPeer({ order: -1 })
      peer.focusCursor().centerOnScreen()
   }

   focusDown() {
      if (this.parent?.local.relatedCollapsed) this.parent.toggleRelated(false)

      const peer = this.nextPeer() || this.newPeer()
      peer.focusCursor().centerOnScreen()
   }

   focusParent() {
      if (this.parent) this.parent.focusCursor()
   }

   focusRelated() {
      const child = this.children.find((d) => d.show && d.order === 0)
      if (!child) this.newRelated().focusCursor()
      else if (!child.show) child.focusDown()
      else child.focusCursor()
   }

   focusLeft() {
      if (this.side === Side.LEFT) this.focusParent()
      else if (this.side === Side.RIGHT) this.focusRelated()
   }

   focusRight() {
      if (this.side === Side.LEFT) this.focusRelated()
      else if (this.side === Side.RIGHT) this.focusParent()
   }

   handleInputClick(element: "text" | "title", position?: number) {
      if (!this.isSelected || this.local.shouldFocusCursor !== element) {
         this.focusCursor(element, position)
      }
   }

   hotseat() {
      this.update({ exploded: true })
      cardStore.setHotseat(this)
      this.centerOnScreen()
   }
}

class CardStore extends Store<typeof CardRecord, CardRecord> {
   @observable currentSelected: CardRecord | null = null

   @observable currentHotseat: CardRecord | null = null

   loadCards(boardId: string) {
      const q = query(this.collection, where("boardId", "==", boardId))
      return this.loadRecords([q], true)
   }

   @computed
   get isHotseat() {
      return !!this.currentHotseat
   }

   @action
   setHotseat(card: CardRecord | CardRecord | null) {
      const current = this.currentHotseat

      if (card === null && this.currentHotseat) {
         if (this.currentHotseat.ultraZen) this.currentHotseat.update({ ultraZen: false })
      }

      this.currentHotseat = card as CardRecord

      current?.centerOnScreen()
   }

   @action
   setSelected(card: CardRecord | CardRecord | null) {
      // clear current selection, cursor focus, and screen centering target

      if (this.currentSelected && this.currentSelected !== card) {
         // TODO: blur the ref

         this.currentSelected.local.shouldCenterScreen = false

         this.currentSelected.local.shouldFocusCursor = false
         this.currentSelected.local.cursorFocusPosition = undefined
      }

      this.currentSelected = card as CardRecord
   }
}

export const cardStore = new CardStore(CardRecord, "CardData").init()

interface HasParentAndChildren {
   parent: HasParentAndChildren | null
   children: HasParentAndChildren[]
}

export function allAncestors<T extends HasParentAndChildren, Y>(item: T, fn: (item: T) => Y): Y[] {
   const results = []
   while (item.parent) {
      results.push(fn(item.parent as T))
      item = item.parent as T
   }
   return results
}

export function allDescendent<T extends HasParentAndChildren, Y>(items: T[], fn: (item: T) => Y): Y[] {
   return [...items.flatMap((item) => allDescendentAndRoot(item, fn))]
}

export function allDescendentAndRoot<T extends HasParentAndChildren, Y>(item: T, fn: (item: T) => Y): Y[] {
   return [fn(item), ...item.children.flatMap((child) => allDescendentAndRoot(child as T, fn))]
}

// @ts-ignore
window.cardStore = cardStore
