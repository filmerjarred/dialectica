import escapeStringRegexp from "escape-string-regexp"
import { cardCommandMap } from "./cardCommands"
import { cardStore, toUpperFirst } from "./card.data"
import { boardCommandMap } from "./boardCommands"
import { todoCommandMap } from "./todoCommands"
import _ from "lodash"
import { todoStore } from "./todo.data"
import { boardStore } from "./board.data"

export const allHotkeys = { ...todoCommandMap, ...cardCommandMap, ...boardCommandMap }

const allCommands = [...Object.keys(cardCommandMap), ...Object.keys(boardCommandMap), ...Object.keys(todoCommandMap)]

if (allCommands.length !== _.uniq(allCommands).length) {
   throw new Error("Duplicate command")
}

export type KeyMapKey = keyof typeof allHotkeys & string

export const commandName = (id: KeyMapKey) => {
   return allHotkeys[id].name
      ? allHotkeys[id].name
      : id
           .split("_")
           .map((x) => toUpperFirst(x))
           .join(" ")
}

function matches(shortcut: string | string[] | undefined, e: KeyboardEvent) {
   if (!shortcut) return false

   const shortcuts = Array.isArray(shortcut) ? shortcut : [shortcut]

   for (const shortcut of shortcuts) {
      if (shortcut.includes("shift+") && !e.shiftKey) continue
      if (shortcut.includes("ctrl+") && !e.ctrlKey) continue
      if (shortcut.includes("alt+") && !e.altKey) continue

      if (new RegExp(`\\+${escapeStringRegexp(e.key.toLowerCase())}$`).test(shortcut.toLowerCase())) return true
   }

   return false
}

export function hotkeyKeyDown(e: KeyboardEvent) {
   for (const i in allHotkeys) {
      // @ts-ignore
      const hotkey = allHotkeys[i]

      let record
      if (cardCommandMap[i]) record = cardStore.currentSelected
      if (todoCommandMap[i]) record = todoStore.currentSelected
      if (boardCommandMap[i]) record = boardStore.currentSelected

      if (record && matches(hotkey.shortcut, e)) {
         e.preventDefault()
         try {
            hotkey.fn(record as any)
         } catch (e) {
            console.error(e)
         }
         return
      }
   }
}
