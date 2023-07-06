// Get the imports
import { Record, Store } from "./makeStore"
import { action, computed, observable } from "mobx"
import { CardRecord, cardStore, CardLocationType, Side } from "./card.data"
import { getUser } from "./useUser"
import autoBind from "auto-bind"
import { TimelineDataChunk, timelineStore } from "./timeline.data"
import _, { update } from "lodash"
import { emailPublish } from "./cloud-function"
import { uuidv4 } from "@firebase/util"
import { userStore } from "./user.data"
import { messageStore } from "./messages.data"
import { lexicalToText, removeNewlines } from "./lexicalToText"
import { query, where } from "firebase/firestore"
import { toast } from "react-toastify"
import { TodoStatus, todoStore } from "./todo.data"
import { makeLexicalWikilink } from "../components/Todo"
import { runTransaction } from "firebase/firestore"
import * as Sentry from "@sentry/react"
import { init } from "@paralleldrive/cuid2"

async function updateParagraph(t: string): Promise<string | null> {
   if (t.includes(`"type":"paragraph"`)) {
      const x = `"type":"dialectica-paragraph", "config":{"id":"${uuidv4()}"}`

      t = t.replaceAll(`"type":"paragraph"`, x)
   }

   return removeNewlines(t)
}

const createId = init({
   length: 10,
})

export class BoardRecord extends Record<BoardRecord> {
   @observable name!: string
   @observable.struct userIds!: string[]

   @observable.struct spectatorUserIds!: string[]

   @observable local!: { leftUserId: string; forceTodoRefresh: number }

   localNonObserved: { panzoom?: any; justify?: () => void } = {}

   static defaults = {
      name: "New Board",
      spectatorUserIds: [],
      userDataObjects: {},
      local: { forceTodoRefresh: 1 },
      localNonObserved: {},
   }

   constructor() {
      super()
      autoBind(this)
   }

   @computed
   get partnerId() {
      const user = getUser()
      return this.userIds.find((u) => u !== user.uid)
   }

   @computed
   get owner() {
      const user = userStore.getUserRecord()
      return user
   }

   @computed
   get partner() {
      return userStore.records.get(this.partnerId!)
   }

   @computed.struct
   get cards() {
      return Array.from(cardStore.records.values()).filter(
         (card) => card.boardId === this.id && !(card.parentId && !card.parent)
      )
   }

   @computed.struct
   get todos() {
      return Array.from(todoStore.records.values())
   }

   @computed.struct
   get userRoots() {
      this.local.forceTodoRefresh
      const userId = getUser().uid
      return this.todos.filter((t) => t.userId === userId && !t.parentId)
   }

   @computed.struct
   get userTodoRoots() {
      return this.userRoots.filter((t) => !t.isInInbox)
   }

   @computed.struct
   get userInboxRoots() {
      return this.userRoots.filter((t) => t.isInInbox)
   }

   @computed.struct
   get partnerRoots() {
      const partnerUserId = this.partner?.id
      if (!partnerUserId) return []
      return this.todos.filter((t) => t.userId === partnerUserId && !t.parentId)
   }

   @computed.struct
   get partnerTodoRoots() {
      return this.partnerRoots.filter((t) => !t.isInInbox)
   }

   @computed.struct
   get partnerInboxRoots() {
      return this.partnerRoots.filter((t) => t.isInInbox)
   }

   @computed.struct
   get messages() {
      return Array.from(messageStore.records.values()).filter((message) => message.boardId === this.id)
   }

   @computed.struct
   get timeline() {
      return _(
         Array.from(
            timelineStore.loadRecords([query(timelineStore.collection, where("boardId", "==", this.id))]).values()
         )
      )
         .sortBy(({ time }) => time * -1)
         .value()
   }

   @computed.struct
   get userCards() {
      const user = getUser()
      return this.cards.filter((card) => card.ownerUserId === user.uid)
   }

   @computed
   get rightUser() {
      if (this.userIds.length < 2) return null

      const rightUserId = this.userIds.find((id) => id !== this.local.leftUserId)!

      return userStore.records.get(rightUserId) || null
   }

   @computed
   get leftUser() {
      return userStore.records.get(this.local.leftUserId || this.userIds[0])!
   }

   @computed.struct
   get leftRoots() {
      return this.cards.filter(
         (c) => !c.parentId && c.side === Side.LEFT && c.cardLocationType === CardLocationType.POSITION
      )
   }

   @computed.struct
   get rightRoots() {
      return this.cards.filter(
         (c) => !c.parentId && c.side === Side.RIGHT && c.cardLocationType === CardLocationType.POSITION
      )
   }

   @computed.struct
   get discussionRoots() {
      return this.cards.filter((c) => !c.parentId && c.cardLocationType === CardLocationType.DISCUSSION)
   }

   @computed.struct
   get agreedCentralPositions() {
      return this.cards.filter((c) => c.isAgreed && c.isCentralPosition)
   }

   @computed.struct
   get partnersCards() {
      const user = getUser()
      return this.cards.filter((card) => card.ownerUserId !== user.uid)
   }

   @computed
   get hasUnpublishedChanges() {
      return this.userCards.some((card) => card.hasUnpublishedChanges)
   }

   @computed
   get hasUnrevealedChanges() {
      return this.partnersCards.some((partnerCard) => {
         const weWantShown = partnerCard.partnerWantsShown

         // return cards they want to show that either we haven't said we want to see or has an update
         return partnerCard.ownerWantsShown && (!weWantShown || partnerCard.unrevealedUpdate)
      })
   }

   @action
   switch() {
      if (this.rightUser) {
         this.local.leftUserId = this.rightUser.id
      }

      // this.localNonObserved.panzoom.smoothMoveTo(0, 0)
   }

   incrementalExpand(level: number = 1) {
      const cards = this.cards.filter((c) => c.depth === level && c.cardLocationType === CardLocationType.POSITION)

      if (!cards.length) return

      const allFolded = cards.every((c) => (c.local.relatedCollapsed || !c.children.length) && c.local.textCollapsed)
      const allUnfolded = cards.every((c) => !c.local.relatedCollapsed && c.local.textCollapsed)

      if (allUnfolded) {
         this.incrementalExpand(level + 1)
      } else if (allFolded) {
         this.fold(level + 1)
      } else {
         this.fold(level)
      }
   }

   revealLatest() {
      const user = getUser()

      const commentTodos: string[] = []
      const commentBeforeString = "please read comments on "

      this.partnersCards.forEach((partnerCard) => {
         if (!partnerCard.ownerWantsShown) return

         const update: Partial<CardRecord> = { partnerWantsShown: true }

         if (partnerCard.unrevealedUpdate) {
            update.unrevealedUpdate = false

            if (partnerCard.updatedTitle) {
               update.oldTitle = partnerCard.updatedTitle
               update.updatedTitle = null
            }

            if (partnerCard.updatedText) {
               if (partnerCard.oldText === CardRecord.defaults.oldText) {
                  const existing =
                     this.todos.find(
                        (t) =>
                           t.cards.includes(partnerCard) &&
                           (partnerCard.cardLocationType === CardLocationType.PARAGRAPH
                              ? t.text.includes(commentBeforeString)
                              : true)
                     ) || commentTodos.includes(partnerCard.id)

                  if (!existing) {
                     let title
                     if (partnerCard.cardLocationType === CardLocationType.PARAGRAPH) {
                        commentTodos.push(partnerCard.id)
                        title = makeLexicalWikilink({
                           card: partnerCard.paragraphParent!,
                           before: commentBeforeString,
                        })
                     } else {
                        title = makeLexicalWikilink({ card: partnerCard, before: "please read " })
                     }

                     todoStore.create({
                        boardId: this.id,
                        createdByUserId: user.uid,
                        isHeader: false,
                        isInInbox: true,
                        order: this.userInboxRoots.length,
                        parentId: null,
                        userId: user.uid,
                        title,
                     })
                  }
               }

               update.oldText = partnerCard.updatedText
               update.updatedText = null
            }
         }

         partnerCard.update(update)
      })
   }

   cleanupParagraphCards() {
      if (1) return null

      this.userCards.forEach((c) => {
         if (c.paragraphParentCardId) {
            const card = cardStore.records.get(c.paragraphParentCardId)

            if (!card || !card.text.includes(c.paragraphId!)) {
               c.delete()
            }
         }
      })
   }

   @action
   async publish() {
      const user = getUser()
      const partnerUserId = this.userIds.find((u) => u !== user.uid)
      if (!partnerUserId) {
         toast("You need a board partner before you can publish")
         return
      }

      this.cleanupParagraphCards()

      const changedCards = this.userCards.filter((c) => c.hasUnpublishedChanges)

      const changes: TimelineDataChunk[] = changedCards.map((card) => {
         const update: Partial<CardRecord> = { ownerWantsShown: true }

         if (card.updatedTitle || card.updatedText) {
            update.unrevealedUpdate = true
         }

         card.update(update)

         return {
            cardId: card.id,

            oldTitle: card.oldTitle,
            newTitle: card.updatedTitle,

            oldText: lexicalToText(card.oldText),
            newText: card.updatedText ? lexicalToText(card.updatedText) : null,
         }
      })

      const { id: timelineId } = await timelineStore.create(
         {
            boardId: this.id,
            data: JSON.stringify(changes),
            time: Date.now(),
            publishingUserId: user.uid,
            partnerUserId,
         },
         true
      )

      toast.success(`Published!`, { autoClose: 3000 })

      const inbox = boardStore.currentSelected?.todos.filter(
         (t) => t.userId === user.uid && t.status !== TodoStatus.DONE && t.isInInbox
      )
      if (inbox?.length) {
         toast.warn(`Note: ${inbox.length} outstanding items in inbox`, { autoClose: 3000 })
      }

      emailPublish({ timelineId })
   }

   deleteCascade() {
      this.cards.forEach((c) => c.delete())
      this.delete()
   }

   fold(n: number, textCollapsed: boolean = true) {
      this.cards.forEach((card) => {
         if (
            card.cardLocationType === CardLocationType.DISCUSSION ||
            card.cardLocationType === CardLocationType.PARAGRAPH
         )
            return

         if (card.depth >= n) {
            card.updateLocal({
               relatedCollapsed: !!card.children.length,
               textCollapsed: card.plainText === "" || textCollapsed,
            })
         } else {
            card.updateLocal({ relatedCollapsed: false, textCollapsed: card.plainText === "" || textCollapsed })
         }
      })
   }
}

class BoardStore extends Store<typeof BoardRecord, BoardRecord> {
   @observable currentSelected: BoardRecord | null = null

   @action
   setCurrentBoard(board: BoardRecord | null, retries: number = 1) {
      if (this.currentSelected !== board) {
         const user = getUser()

         this.currentSelected = board
         if (board) {
            cardStore.loadCards(board.id)
            todoStore.loadTodos(board.id)

            const promises = [cardStore.loadingResolvable?.promise, todoStore.loadingResolvable?.promise]

            board.local.leftUserId = board.userIds.includes(user.uid) ? user.uid : board.userIds[0]

            Promise.all(promises)
               .then(() => {
                  if (board.cards.find((c) => c.depth > 2)) {
                     // if (process.env.NODE_ENV === "development") {
                     board.fold(1, false)
                     // board.fold(3)
                     // setTimeout(() => {
                     // cardStore.records.get("4516fa4a-e166-4c34-a9e2-9960b4b4ebf2")?.hotseat()
                     // }, 500)
                     // } else {
                     // }
                  }

                  // TODO (remove this eventually)
                  Array.from(cardStore.records.values()).forEach(async (card) => {
                     const oldTextUpdate = await updateParagraph(card.oldText)
                     if (oldTextUpdate) {
                        card.update({ oldText: oldTextUpdate })
                     }

                     if (card.updatedText) {
                        const updatedTextUpdate = await updateParagraph(card.updatedText)
                        if (updatedTextUpdate) {
                           card.update({ updatedText: updatedTextUpdate })
                        }
                     }

                     if (card.plainText === "" && card.cardLocationType !== CardLocationType.PARAGRAPH) {
                        card.toggleTextCollapsed(true)
                     }
                  })

                  board.cards.forEach((card) => {
                     if (card.cardLocationType === CardLocationType.DISCUSSION) {
                        card.updateLocal({ textCollapsed: true, relatedCollapsed: true })
                     }
                  })
               })
               .catch((e) => {
                  if (retries > 4) {
                     Sentry.captureException(e)
                     throw e
                  } else {
                     // issues.md#1
                     console.log("retrying board load...")
                     setTimeout(() => {
                        this.setCurrentBoard(board, retries + 1)
                     }, 150 * retries)
                  }
               })
         }
      }
   }

   getCurrentBoard() {
      if (!this.currentSelected) throw new Error("Could not find board")

      return this.currentSelected
   }

   async newBoard() {
      const user = userStore.getUserRecord()

      const boardId = createId()
      const cardId = uuidv4()

      await boardStore.create(
         {
            userIds: [user.id],
            id: boardId,
            userDataObjects: {
               [user.id]: {
                  showArchivedDiscussion: false,
                  showLeftArchivedPositions: false,
                  showRightArchivedPositions: false,
               },
            },
         },
         true
      )

      cardStore.create({
         id: cardId,
         boardId,
         ownerUserId: user.id,
         order: 0,
         parentId: null,
         cardLocationType: CardLocationType.POSITION,
         treeUserId: user.id,

         paragraphId: null,
         paragraphParentCardId: null,
      })

      // user.update({ boardUIData: { ...user.boardUIData, [boardId]: { focusedCardId: cardId } } })
   }
}

export const boardStore = new BoardStore(BoardRecord, "BoardData").init()
