import { boardStore } from "./board.data"
import { cardStore } from "./card.data"
import { todoStore } from "./todo.data"
import { uiStore } from "./ui.data"
import { userStore } from "./user.data"
import { getUser } from "./useUser"

interface BoardCommand {
   description?: string
   shortcut?: string
   fn: (...args: any[]) => any
   name?: string
}

export const boardCommandMap: { [i: string]: BoardCommand } = {
   DESELECT_CARD: {
      description: "Deselect Card",
      shortcut: "+Escape",
      fn: (board) => {
         cardStore.setSelected(null)
         cardStore.setHotseat(null)
      },
   },

   BOARD_TODO: {
      description: "Add a todo",
      shortcut: "alt+e",
      fn: (board) => {
         const user = getUser()

         todoStore
            .create({
               boardId: board.id,
               createdByUserId: user.uid,
               isHeader: false,
               isInInbox: true,
               order: board.userTodoInboxRoots.length,
               parentId: null,
               userId: user.uid,
            })
            .focusCursor()
      },
   },

   TOGGLE_HELP: {
      shortcut: "ctrl+h",
      fn: () => {
         const user = getUser()
         const userRecord = userStore.records.get(user.uid)!
         userRecord.toggleShowHelp()
      },
   },

   TOGGLE_PARTNER_EXPLORER: {
      shortcut: "ctrl+shift+e",
      fn: () => {
         const user = getUser()
         const userRecord = userStore.records.get(user.uid)!
         userRecord.update({ uiShowPartnerExplorer: !userRecord.uiShowPartnerExplorer })
      },
   },

   TOGGLE_MY_EXPLORER: {
      shortcut: "ctrl+e",
      fn: () => {
         const user = getUser()
         const userRecord = userStore.records.get(user.uid)!
         userRecord.update({ uiShowOwnerExplorer: !userRecord.uiShowOwnerExplorer })
      },
   },

   TOGGLE_FINDER: {
      shortcut: "ctrl+f",
      fn: () => {
         uiStore.toggleShowFinder()
      },
   },

   FOLD_ALL: {
      shortcut: "alt+1",
      fn: () => {
         const board = boardStore.getCurrentBoard()
         board.fold(1)
      },
   },

   FOLD_TO_SECOND: {
      shortcut: "alt+2",
      fn: () => {
         const board = boardStore.getCurrentBoard()
         board.fold(2)
      },
   },

   FOLD_TO_THIRD: {
      shortcut: "alt+3",
      fn: () => {
         const board = boardStore.getCurrentBoard()
         board.fold(3)
      },
   },
}
