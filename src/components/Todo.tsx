import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { observer } from "mobx-react"
import PlaygroundEditorTheme from "../lib/editor/themes/PlaygroundEditorTheme"
import { TodoRecord, TodoStatus, TodoStatusDetails, todoStore } from "../lib/todo.data"
import { Editor } from "./Editor"
import NodeList, { getNodeList } from "../lib/editor/nodes/NodeList"
import _ from "lodash"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { runInAction, trace } from "mobx"
import { lexicalToText } from "../lib/lexicalToText"
// import { useDrag, useDragDropManager, useDrop } from "react-dnd"
import { useDrop, useDrag } from "react-dnd"
import { CardRecord, cardStore } from "../lib/card.data"
import { DragAndDropTypes } from "./Board"
import { mergeRefs } from "react-merge-refs"
import { toast } from "react-toastify"
import { getUser } from "../lib/useUser"

const TodoEditor = observer(function TodoEditor({
   todo,
   textOrTitle,
}: {
   todo: TodoRecord
   textOrTitle: "text" | "title"
}) {
   const [editor] = useLexicalComposerContext()

   useEffect(() => {
      if (todo.local.shouldFocusCursor === textOrTitle) {
         if (editor.getRootElement() !== document.activeElement) {
            editor.focus(() => {}, { defaultSelection: "rootStart" })
         }
      }
   }, [todo, todo.isSelected, todo.local.shouldFocusCursor, document.activeElement])

   return (
      <>
         <Editor cardOrTodo={todo} textOrTitle={textOrTitle}></Editor>
      </>
   )
})

export const Todo = observer(function Todo({ todo, level }: { todo: TodoRecord; level: number }) {
   const ref = useRef<HTMLDivElement>(null)
   const user = getUser()

   const [{ isDragging }, dragRef] = todo.isMine
      ? useDrag(
           () => ({
              type: DragAndDropTypes.TODO,
              item: todo,
              collect: (monitor) => ({
                 isDragging: monitor.isDragging(),
              }),
           }),
           [todo]
        )
      : [{ isDragging: false }]

   function cardToTodo(item: TodoRecord | CardRecord) {
      if (item instanceof CardRecord) {
         if (!item.local.draggedTodo) {
            item.local.draggedTodo = todoStore.create({
               boardId: item.boardId,
               createdByUserId: user.uid,
               isHeader: false,
               isInInbox: todo.isInInbox,
               order: 0, // it's about to replace something so it's w/e
               parentId: todo.parentId,
               userId: todo.userId,
               title: makeLexicalWikilink({ card: item }),
            })
         }

         return item.local.draggedTodo
      } else {
         return item as TodoRecord
      }
   }

   const [{ isOverCurrent }, dropRef] = todo.updateCheck()
      ? useDrop(
           () => ({
              accept: [DragAndDropTypes.TODO, DragAndDropTypes.CARD],

              drop: (draggedItem: TodoRecord | CardRecord) => {
                 const draggedTodo = cardToTodo(draggedItem)

                 if (draggedItem instanceof CardRecord) {
                    delete draggedItem.local.draggedTodo
                 }

                 draggedTodo.focusCursor()
              },
              collect: (monitor) => ({
                 canDrop: !!monitor.canDrop(),
                 isOverCurrent: monitor.isOver({ shallow: true }),
              }),
              hover(draggedItem: TodoRecord | CardRecord) {
                 const draggedTodo = cardToTodo(draggedItem)

                 if (draggedTodo !== todo && !todo.hasAncestor(draggedTodo)) {
                    draggedTodo.replace(todo)
                 }
              },
           }),
           [todo]
        )
      : [{ isOverCurrent: false }, null]

   function onCollapse(e: React.MouseEvent) {
      todo.toggleRelated(!todo.explorerRelatedCollapsed)
   }

   function onBlur() {
      if (!isDragging && todoStore.currentSelected === todo && !ref.current?.contains(document.activeElement)) {
         todoStore.setSelected(null)
      }
   }

   let className = `todo-line explorer-line ${todo.isSelected ? "focused" : ""} `
   if (isDragging) className += "bg-[#00a8df]"

   const initialConfig = {
      namespace: "Todo",
      editable: todo.isMine,
      nodes: getNodeList("Todo"),
      onError: (error: Error) => {
         throw error
      },
      theme: PlaygroundEditorTheme,
   }

   return (
      <div ref={ref} onBlur={onBlur} className={todo.isHeader ? "my-1" : ""}>
         <div>
            {level > 1 ? <div className="indent-line" style={{ left: 17 * level - 3 }}></div> : null}

            {/* todo line */}
            <div
               ref={mergeRefs([dropRef])}
               className={className}
               style={{ paddingLeft: 17 * level + 5 }}
               onClick={(e) => {
                  if (e.ctrlKey || e.altKey) {
                     e.preventDefault()
                     todo.toggleStatus(true)
                  }
               }}
            >
               <div
                  className={`flex flex-1 p-[1px] relative items-baseline flex border border-1 ${
                     isOverCurrent ? "border-[#00a8df]" : "border-transparent"
                  } ${todo.isHeader ? "font-[500]" : ""}`}
               >
                  <span
                     onClick={(e) => {
                        if (e.ctrlKey || e.altKey) {
                           todo.toggleStatus(true)
                           e.stopPropagation()
                        } else {
                           todo.toggleStatus()
                        }
                     }}
                     className="text-xs mr-1 cursor-pointer"
                     ref={dragRef}
                  >
                     {todo.icon}
                  </span>

                  <div className="flex flex-col flex-1">
                     <LexicalComposer initialConfig={{ ...initialConfig, editorState: todo.title }}>
                        <TodoEditor textOrTitle="title" todo={todo} />
                     </LexicalComposer>
                  </div>
               </div>

               <div className="ml-auto actions" onMouseDown={(e) => e.preventDefault() /* prevent blur */}>
                  <i onClick={todo.remove} className="invisible collapse-toggle fal fa-trash"></i>

                  {todo.explorerRelatedCollapsed ? (
                     <i onClick={onCollapse} className="collapse-toggle far fa-chevron-up"></i>
                  ) : (
                     <i onClick={onCollapse} className="invisible collapse-toggle far fa-chevron-down"></i>
                  )}
               </div>
            </div>

            {/* nested child todos */}
            {todo.children && !todo.explorerRelatedCollapsed ? (
               <div className="relative">
                  <Todos todos={todo.children} level={level + 1}></Todos>
               </div>
            ) : null}
         </div>
      </div>
   )
})

export const Todos = observer(function Todos({ todos, level }: { todos: TodoRecord[]; level: number }) {
   const sortedTodos = _(todos)
      .sortBy((c) => c.order)
      .value()

   return (
      <div className="flex flex-col">
         {sortedTodos
            .filter((t) => t.show)
            .map((todo, i) => (
               <Todo key={todo.id} todo={todo} level={level} />
            ))}
      </div>
   )
})

export const TodosWrapper = observer(function TodosWrapper({ todos, level }: { todos: TodoRecord[]; level: number }) {
   return <Todos todos={todos} level={level}></Todos>
})

export function makeLexicalWikilink({
   card,
   before,
   after,
   text,
}: {
   card: CardRecord
   text?: string
   before?: string
   after?: string
}) {
   const nodes: any = {
      root: {
         children: [
            {
               children: [
                  {
                     config: {
                        searchString: text || card.title,
                        cardId: card.id,
                     },
                     type: "wikilink",
                     version: 1,
                  },
               ],
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
   }

   if (before) {
      nodes.root.children[0].children.unshift({
         detail: 0,
         format: 0,
         mode: "normal",
         style: "",
         text: before,
         type: "text",
         version: 1,
      })
   }

   if (after) {
      nodes.root.children[0].children.push({
         detail: 0,
         format: 0,
         mode: "normal",
         style: "",
         text: after,
         type: "text",
         version: 1,
      })
   }

   return JSON.stringify(nodes)
}
