import { TodoRecord, todoStore, toUpperFirst } from "./todo.data"

interface TodoCommand {
   shortcut?: string | string[]
   fn: (todo: TodoRecord) => any
   name?: string
   description?: string
}

export const todoCommandMap: { [i: string]: TodoCommand } = {
   DELETE_TODO: {
      shortcut: "alt+Backspace",
      fn: (todo) => todo?.remove(),
   },

   NEW_TODO_BELOW: {
      shortcut: "alt+shift+ArrowDown",
      name: "Add Todo Below",
      fn: (todo) => todo.newBelow().focusCursor(),
   },

   NEW_TODO_ABOVE: {
      shortcut: "alt+shift+ArrowUp",
      name: "Add Todo Above",
      fn: (todo) => todo.newAbove().focusCursor(),
   },

   MOVE_TODO_UP: {
      shortcut: "alt+ArrowUp",
      name: "Move todo up",
      fn: (todo) => todo.moveUp(),
   },
   MOVE_TODO_DOWN: {
      shortcut: "alt+ArrowDown",
      name: "Move todo down",
      fn: (todo) => todo.moveDown(),
   },

   NEW_CHILD_TODO: {
      shortcut: ["alt+shift+ArrowRight", "alt+ArrowRight"],
      name: "Add Child Todo",
      fn: (todo) => todo.newRelated().focusCursor(),
   },

   NEW_PARENT_TODO: {
      shortcut: ["alt+shift+ArrowLeft", "alt+ArrowLeft"],
      name: "Add Child Todo",
      fn: (todo) => todo.parent?.newBelow().focusCursor(),
   },
}
