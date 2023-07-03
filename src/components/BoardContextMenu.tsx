import _ from "lodash"
import { observer } from "mobx-react"
import { Menu, Item, Separator, useContextMenu, RightSlot } from "react-contexify"
import { boardCommandMap } from "../lib/boardCommands"
import { BoardRecord, boardStore } from "../lib/board.data"
import { KeyMapKey, commandName } from "../lib/hotkeys"

export const BOARD_CONTEXT_MENU_ID = "OWNER_BOARD_CONTEXT_MENU_ID"

export enum OP {
   DELETE,
   NEW_PEER,
   NEW_RELATED,

   COLLAPSE_RELATED,
   COLLAPSE_TEXT,

   TAG,
}

export function useBoardContextMenu() {
   const { show } = useContextMenu({
      id: BOARD_CONTEXT_MENU_ID,
   })

   // Gets called on right-click
   return async function handleContextMenu(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
      show({ event })
   }
}

function Command({ id, board }: { board: BoardRecord; id: KeyMapKey }) {
   return (
      <Item onClick={() => boardCommandMap[id].fn(board)}>
         {commandName(id)} <RightSlot>{boardCommandMap[id].shortcut}</RightSlot>
      </Item>
   )
}

export const BoardContextMenu = observer(function BoardContextMenu({ board }: { board: BoardRecord }) {
   return (
      <Menu id={BOARD_CONTEXT_MENU_ID}>
         <Command id="FOLD_ALL" board={board}></Command>
         <Command id="FOLD_TO_SECOND" board={board}></Command>
         <Command id="FOLD_TO_THIRD" board={board}></Command>
      </Menu>
   )
})
