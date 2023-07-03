import { boardStore } from "./board.data"
import { action, computed, observable, runInAction } from "mobx"
import { Record, Store } from "./makeStore"
import _ from "lodash"
import { getUser } from "./useUser"
import { userStore } from "./user.data"
import autoBind from "auto-bind"
import { query, where } from "firebase/firestore"
import { lexicalToText } from "./lexicalToText"
import { toast } from "react-toastify"
import { uiStore } from "./ui.data"
import moment from "moment"
import { CardRecord, Side, allAncestors, allDescendent, allDescendentAndRoot, cardStore } from "./card.data"
import { getWikiLinks } from "./editor/plugins/WikiLinksPlugin"

const DAY = 1000 * 60 * 60 * 24
let START_OF_TODAY = moment().startOf("day").valueOf()

setInterval(() => {
   START_OF_TODAY = moment().startOf("day").valueOf()
   runInAction(() => {
      boardStore.currentSelected?.local.forceTodoRefresh
   })
}, 1000 * 60 * 60)

export enum TodoStatus {
   TODO = "TODO",
   ACTIVE = "ACTIVE",
   DONE = "DONE",
}

export const TodoStatusDetails = {
   [TodoStatus.TODO]: {
      icon: "📌",
   },
   [TodoStatus.ACTIVE]: {
      icon: "🚀",
   },
   [TodoStatus.DONE]: {
      icon: "✔",
   },
}

export function toUpperFirst(tag: string) {
   return _.upperFirst(tag.toLowerCase())
}

export class TodoRecord extends Record<TodoRecord> {
   // export class TodoRecord extends Record<TodoRecord> {
   @observable title!: string
   @observable text!: string
   @observable boardId!: string

   @observable userId!: string // user the todo is for
   @observable createdByUserId!: string

   @observable status!: TodoStatus
   @observable doneDate?: number | null

   @observable order!: number

   @observable isHeader!: boolean
   @observable isInInbox!: boolean

   @observable parentId!: string | null

   @observable explorerRelatedCollapsed!: boolean

   @observable local!: {
      ref?: React.LegacyRef<HTMLDivElement>

      shouldFocusCursor: "title" | "text" | false
      cursorFocusPosition?: number

      textCollapsed: boolean
   }

   static defaults = {
      status: TodoStatus.TODO,
      explorerRelatedCollapsed: false,

      title: JSON.stringify({
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

      text: JSON.stringify({
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

      local: {
         isFocused: false,
         focusedElement: null,
      },
      localNonObserved: {},
   }

   constructor() {
      super()
      autoBind(this)
   }

   updateCheck() {
      const user = getUser()
      return this.userId === user.uid || this.isInInbox
   }

   @computed get isSelected() {
      return todoStore.currentSelected === this
   }

   @computed get isMine() {
      const user = getUser()
      return this.userId === user.uid || (this.isInInbox && this.createdByUserId === user.uid)
   }

   // ==== COMPUTED RELATIONSHIP Functions ======
   get depth() {
      let x = 1
      let parent = this.parent as TodoRecord
      while (parent) {
         x++
         parent = parent.parent as TodoRecord
      }
      return x
   }

   @computed
   get user() {
      return userStore.records.get(this.userId)!
   }

   @computed
   get board() {
      const board = boardStore.records.get(this.boardId)
      if (!board) throw new Error("could not find board for todo")
      return board
   }

   @computed
   get parent(): TodoRecord | null {
      if (this.parentId) return todoStore.records.get(this.parentId) || null
      return null
   }

   @computed
   get cards(): CardRecord[] {
      const wikiLinks = getWikiLinks(this.title)

      const cards = wikiLinks.flatMap((link) => {
         if (!link.config.cardId) return []

         const card = cardStore.records.get(link.config.cardId)
         if (card) return [card]
         else return []
      })

      return cards
   }

   get icon() {
      return this.isHeader ? "🧵" : TodoStatusDetails[this.status].icon
   }

   @computed.struct
   get children() {
      return _(Array.from(todoStore.records.values()))
         .filter((todo) => todo.parentId === this.id)
         .sortBy((c) => c.order)
         .value()
   }

   get shownChildren() {
      return this.children.filter((todo) => todo.show)
   }

   @computed.struct
   get roots() {
      return (
         _(Array.from(todoStore.records.values()))
            // all other Todos on the same board and side with no parents
            .filter((todo) => !todo.parentId && todo.userId === this.userId && todo.isInInbox === this.isInInbox)
            .sortBy((d) => d.order)
            .value()
      )
   }

   @computed.struct
   get peers() {
      return this.parent
         ? this.parent.children.filter((c) => c.id !== this.id)
         : this.roots.filter((c) => c.id !== this.id)
   }

   get shownPeers() {
      return this.peers.filter((todo) => todo.show)
   }

   // whether or not Todo is an ancestor of this
   hasAncestor(Todo: TodoRecord) {
      let parent = this.parent as TodoRecord
      while (parent) {
         if (parent === Todo) {
            return true
         }
         parent = parent.parent as TodoRecord
      }
      return false
   }

   focusOnRemove() {
      const toFocus = this.above || this.below
      if (toFocus) toFocus.focusCursor()
   }

   remove() {
      const todo = this

      if (todoStore.currentSelected === todo) {
         todo.focusOnRemove()
      }

      todo.delete()
      this.reconcilePeerOrder()
   }

   // ==== UPDATE/DATA Functions ======
   toggleRelated(val?: boolean) {
      if (val !== undefined && val === this.explorerRelatedCollapsed) return
      this.update({
         explorerRelatedCollapsed: val === undefined ? !this.explorerRelatedCollapsed : val,
      })
   }

   toggleText(val?: boolean) {
      this.updateLocal({
         textCollapsed: val === undefined ? !this.local.textCollapsed : val,
      })
   }

   @action
   updateLocal(update: Partial<TodoRecord["local"]>) {
      Object.assign(this.local, update)
   }

   toggleStatus(alt?: boolean) {
      const todo = this

      if (this.isHeader) return null

      let status

      if (!alt) {
         if (todo.status === TodoStatus.TODO) {
            status = TodoStatus.DONE
         } else if (todo.status === TodoStatus.ACTIVE) {
            status = TodoStatus.DONE
         } else {
            status = TodoStatus.TODO
         }
      } else {
         if (todo.status === TodoStatus.ACTIVE) {
            status = TodoStatus.TODO
         } else {
            status = TodoStatus.ACTIVE
         }
      }

      if (status === TodoStatus.DONE) {
         todo.update({ status, doneDate: Date.now() })
      } else {
         todo.update({ status, doneDate: null })
      }
   }

   // ==== Core Positioning Functions ======

   get above(): TodoRecord | null {
      if (this.order === 0) {
         return this.parent
      } else if (this.previousPeer?.shownChildren.length) {
         // todo, deep nesting
         return this.previousPeer.grandestChild
      } else {
         return this.previousPeer
      }
   }

   get below(): TodoRecord | null {
      if (this.shownChildren.length) {
         return this.shownChildren[0]
      } else if (this.parent && this.order === this.shownPeers.length) {
         return this.grandestNextPeer
      } else {
         return this.nextPeer
      }
   }

   get previousPeer(): TodoRecord | null {
      const peer = this.peers.find((p) => p.order === this.order - 1)
      if (!peer) return null

      if (peer.show) return peer
      else return peer.previousPeer
   }

   get nextPeer(): TodoRecord | null {
      const peer = this.peers.find((p) => p.order === this.order + 1)
      if (!peer) return null

      if (peer.show) return peer
      else return peer.nextPeer
   }

   get grandestChild(): TodoRecord {
      if (this.shownChildren.length) {
         return _.last(this.shownChildren)!.grandestChild
      } else {
         return this
      }
   }

   get grandestNextPeer(): TodoRecord | null {
      if (this.nextPeer) return this.nextPeer

      if (!this.parent) return null

      if (!this.nextPeer) return this.parent.grandestNextPeer

      return null
   }

   // ==== UI Functions ======

   @action
   focusCursor(element?: "title" | "text", position?: number) {
      todoStore.setSelected(this)

      this.local.shouldFocusCursor = element || "title"
      this.local.cursorFocusPosition = position

      if (!this.isInInbox) {
         if (!uiStore.getShowTodo(this.side)) {
            uiStore.toggleShowTodo(this.side)
         }
      } else {
         if (!uiStore.getShowInbox(this.side)) {
            uiStore.toggleShowInbox(this.side)
         }
      }

      allAncestors(this, (t) => t.update({ explorerRelatedCollapsed: false }))

      return this
   }

   @computed
   get side() {
      return this.userId === userStore.getUserRecord().id ? Side.LEFT : Side.RIGHT
   }

   @computed
   get hideDone(): boolean {
      return (
         !uiStore.getShowOldDone(this.side, this.isInInbox) &&
         this.status === TodoStatus.DONE &&
         START_OF_TODAY - this.doneDate! > DAY
      )
   }

   @computed
   get show(): boolean {
      const todo = this

      if (this.parent?.explorerRelatedCollapsed) return false

      if (this.hideDone) return false

      if (this.isHeader) return allDescendent(todo.children, (t) => !t.hideDone).every((x) => x)

      if (uiStore.hideInactiveTodo && !todo.isInInbox) {
         // this isn't active and no parents are and no children are
         if (
            allAncestors(this, (t) => t.status).every((x) => x !== TodoStatus.ACTIVE) &&
            allDescendentAndRoot(this, (t) => t.status).every((x) => x !== TodoStatus.ACTIVE)
         )
            return false
      }

      return true
   }

   @computed
   get showOnCard(): boolean {
      const todo = this

      if (this.hideDone) return true

      if (this.isHeader) return false

      return true
   }

   indent() {
      const previousPeer = this.previousPeer
      if (!previousPeer) return null

      const oldPeer = this.peers[0]

      // re parent children
      // this.children.forEach((child) => {
      //    child.update({
      //       parentId: previousPeer.id,
      //       order: this.order + child.order / 10,
      //    })
      // })

      this.update({
         parentId: previousPeer.id,
         order: previousPeer.children.length,
      })

      if (oldPeer) {
         oldPeer.reconcilePeerOrder()
      }

      this.reconcilePeerOrder()

      allAncestors(this, (t) => (t.explorerRelatedCollapsed ? t.toggleRelated(false) : null))
   }

   get plainText() {
      return lexicalToText(this.title)
   }

   // become the parent's peer
   // make peers after into children

   outdent() {
      const parent = this.parent
      if (!parent) return null

      const oldPeer = this.peers[0]

      const afterPeers = this.peers.filter((p) => p.order > this.order)
      afterPeers.forEach((p) => {
         p.update({
            parentId: this.id,
            order: this.children.length + p.order,
         })
      })
      this.update({
         parentId: parent.parentId,
         order: parent.order + 0.5,
      })

      if (oldPeer) {
         oldPeer.reconcilePeerOrder()
      }

      if (afterPeers.length) {
         this.children[0].reconcilePeerOrder
      }

      this.reconcilePeerOrder()
   }

   newAbove() {
      return this.newPeer({ order: this.order - 0.5 })
   }

   newBelow() {
      return this.newPeer({ order: this.order + 0.5 })
   }

   newPeer(data?: Partial<TodoRecord>) {
      const user = getUser()

      const newTodo = todoStore.create({
         order: this.order + 1,
         parentId: this.parentId,
         boardId: this.boardId,
         userId: this.userId,
         createdByUserId: user.uid,
         isHeader: false,
         isInInbox: this.isInInbox,
         ...data,
      })

      if (data?.order !== undefined) {
         this.reconcilePeerOrder()
      }

      return newTodo
   }

   newRelated(data?: Partial<TodoRecord>) {
      const user = getUser()

      const newTodo = todoStore.create({
         order: 0,
         parentId: this.id,
         boardId: this.boardId,
         userId: this.userId,
         createdByUserId: user.uid,
         isHeader: false,
         isInInbox: this.isInInbox,
         ...data,
      })

      return newTodo
   }

   replace(todo: TodoRecord) {
      if (this.getGlobalOrder() > todo.getGlobalOrder()) {
         this.moveAbove(todo)
      } else {
         this.moveBelow(todo)
      }
   }

   moveAbove(todo: TodoRecord) {
      const oldPeer = this.peers[0]
      this.update({
         order: todo.order - 0.5,
         parentId: todo.parentId,
         isInInbox: todo.isInInbox,
      })

      this.reconcilePeerOrder()
      if (oldPeer) oldPeer.reconcilePeerOrder()
   }

   moveBelow(todo: TodoRecord) {
      if (todo.hasAncestor(this)) {
         return toast("Cannot move a todo under it's descendant")
      }

      const oldPeer = this.peers[0]

      this.update({
         order: todo.order + 0.5,
         parentId: todo.parentId,
         isInInbox: todo.isInInbox,
      })

      this.reconcilePeerOrder()
      if (oldPeer && oldPeer.parent !== this.parent) oldPeer.reconcilePeerOrder()
   }

   makeChildOf(parent: TodoRecord) {
      const oldPeer = this.peers[0]
      this.update({ order: parent.children.length, parentId: parent.id })

      this.reconcilePeerOrder()
      if (oldPeer) oldPeer.reconcilePeerOrder()
   }

   moveUp() {
      if (this.previousPeer) {
         this.moveAbove(this.previousPeer)
      } else if (this.parent?.above) {
         if (this.parent.above.depth >= this.depth) {
            this.moveBelow(this.parent.above)
         } else {
            this.makeChildOf(this.parent.above)
         }
      }
   }

   moveDown() {
      if (this.nextPeer) {
         this.moveBelow(this.nextPeer)
      } else if (this.parent?.nextPeer) {
         if (this.parent.nextPeer.depth >= this.depth) {
            this.moveBelow(this.parent.nextPeer)
         } else {
            this.makeChildOf(this.parent.nextPeer)
         }
      }
   }

   getGlobalOrder(divisor = this.depth - 1): number {
      if (this.parent) {
         // 1 => 1
         // 2 => 0.2
         // 3 => 0.03

         return this.parent.getGlobalOrder(divisor - 1) + (this.order + 1) / 100 ** divisor
      } else {
         return (this.isInInbox ? 2 : 1) + (this.order + 1) / 10
      }
   }

   reconcilePeerOrder() {
      _(this.parent ? this.parent.children : this.roots)
         .sortBy((c) => c.order)
         .forEach((todo, index) => {
            if (todo.order !== index) {
               todo.update({ order: index })
            }
         })
   }

   focusUp() {
      const peer = this.above
      if (peer) {
         if (peer.show) {
            peer.focusCursor()
         } else {
            peer.focusUp()
         }
      } else if (this.isInInbox) {
         const nonInbox = Array.from(todoStore.records.values()).filter(
            (t) => t.userId === this.userId && !t.isInInbox && t.show
         )
         const lastNonInbox = _.maxBy(nonInbox, (r) => r.getGlobalOrder())

         if (lastNonInbox) {
            lastNonInbox.focusCursor()
         }
      }
   }

   focusDown() {
      const peer = this.below
      if (peer) {
         if (peer.show) {
            peer.focusCursor()
         } else {
            peer.focusUp()
         }
      } else if (!this.isInInbox) {
         const inbox = Array.from(todoStore.records.values()).filter(
            (t) => t.userId === this.userId && t.isInInbox && !t.parentId && t.show
         )
         const firstInbox = _.minBy(inbox, (r) => r.getGlobalOrder())
         if (firstInbox) {
            firstInbox.focusCursor()
         }
      }
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

   handleInputClick(element: "text" | "title", position?: number) {
      if (!this.isSelected || this.local.shouldFocusCursor !== element) {
         this.focusCursor(element, position)
      }
   }
}

class TodoStore extends Store<typeof TodoRecord, TodoRecord> {
   @observable currentSelected: TodoRecord | null = null

   loadTodos(boardId: string) {
      const q = query(this.collection, where("boardId", "==", boardId))
      return this.loadRecords([q], true)
   }

   @action
   setSelected(todo: TodoRecord | TodoRecord | null) {
      if (this.currentSelected && this.currentSelected !== todo) {
         this.currentSelected.local.shouldFocusCursor = false
         this.currentSelected.local.cursorFocusPosition = undefined
      }

      this.currentSelected = todo as TodoRecord
   }
}

export const todoStore = new TodoStore(TodoRecord, "TodoData").init()

// @ts-ignore
window.todoStore = todoStore
