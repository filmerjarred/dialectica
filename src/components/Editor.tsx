import { observer } from "mobx-react"
import { useCallback, useEffect, useLayoutEffect, useState } from "react"
import { $getRoot, $getSelection, $setSelection, EditorConfig, LexicalEditor } from "lexical"

import { CardRecord, cardStore } from "../lib/card.data"
import LexicalEditorComponent from "../lib/editor/LexicalEditor"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import _ from "lodash"
import { saveToLocalLog } from "../lib/localLog"
import { runInAction, trace } from "mobx"
import { TodoRecord, todoStore } from "../lib/todo.data"
import { lexicalToText } from "../lib/lexicalToText"
import { RelatedCards } from "./RelatedCards"
import { InitialConfigType } from "@lexical/react/LexicalComposer"

const CardEditor = observer(CardEditorComponent)
const TodoEditor = observer(TodoEditorComponent)
export const Editor = observer(EditorComponent)

export interface DialecticaEditorConfig extends InitialConfigType {
   card: CardRecord
}

function EditorComponent({
   cardOrTodo,
   textOrTitle,
}: {
   cardOrTodo: CardRecord | TodoRecord
   textOrTitle: "text" | "title"
}) {
   return cardOrTodo instanceof CardRecord ? (
      <CardEditor card={cardOrTodo} />
   ) : (
      <TodoEditor todo={cardOrTodo} textOrTitle={textOrTitle} />
   )
}

function CardEditorComponent({ card }: { card: CardRecord }) {
   const [isEmpty, setIsEmpty] = useState(false)

   const [editor] = useLexicalComposerContext()

   if (!card.isMine) {
      useCallback(() => {
         editor.update(() => {
            const parsedEditorState = editor.parseEditorState(card.text)
            editor.setEditorState(parsedEditorState)

            parsedEditorState.read(() => {
               const text = $getRoot().getTextContent()
               if (!text) {
                  setIsEmpty(true)
               } else {
                  setIsEmpty(false)
               }
            })
         })
      }, [card.text])
   }

   useEffect(() => {
      return () => {
         runInAction(() => {
            // only remove paragraphs that are from old editor
            _.remove(card.local.lexicalParagraphs, (p) => p.editorId === editor._config.theme.id)
         })
      }
   }, [editor])

   const updateText = (text: string) => {
      saveToLocalLog(text)
      card.update({ updatedText: JSON.stringify(text) })
   }
   const onTextUpdate = useCallback(updateText, [card])

   const onTextFocus = useCallback(() => card.handleInputClick("text"), [card])

   const onKeyDown = (e: KeyboardEvent, editor: LexicalEditor) => {
      if (!e.altKey && e.key === "ArrowUp") {
         const editorCords = editor.getRootElement()?.getClientRects()[0]
         const cursorCords = _.last(window.getSelection()?.getRangeAt(0).getClientRects())

         editor.getEditorState().read(() => {
            if (!$getRoot().getTextContent().length) {
               e.preventDefault()
               card.focusCursor("title", 0)
            }

            if (editorCords && cursorCords) {
               const line = Math.floor((cursorCords.bottom - cursorCords.height - editorCords.y) / cursorCords.height)

               if (line === 0) {
                  const position = window.getSelection()?.getRangeAt(0).startOffset
                  card.focusCursor("title", position)
                  return true
               }
            }
         })
      }
   }

   const onClick = card.isMine
      ? () => {
           card.focusCursor("text")
        }
      : undefined

   if (isEmpty) return null

   return (
      <div className="flex">
         <LexicalEditorComponent
            onClick={onClick}
            onTextUpdate={onTextUpdate}
            onTextFocus={onTextFocus}
            onKeyDown={onKeyDown}
         />
         <RelatedCards card={card} />
      </div>
   )
}

function TodoEditorComponent({ todo, textOrTitle }: { todo: TodoRecord; textOrTitle: "text" | "title" }) {
   if (todo.isMine) {
      const updateText = (text: string) => {
         saveToLocalLog(text)
         todo.update({ [textOrTitle]: JSON.stringify(text) })
      }
      const onTextUpdate = useCallback(updateText, [todo])

      const onTextFocus = useCallback(() => todo.handleInputClick(textOrTitle), [todo])

      const onKeyDown = (e: KeyboardEvent, editor: LexicalEditor) => {
         if (e.altKey) return false

         if (e.key === "ArrowUp") {
            todo.focusUp()

            e.preventDefault()
            return true
         } else if (e.key === "ArrowDown") {
            todo.focusDown()
            e.preventDefault()
            return true
            // if (textOrTitle === "title") {
            // if (!lexicalToText(todo.text)) {
            // } else {
            // todo.focusCursor("text")
            // }
            // } else {
            //    const editorCords = editor.getRootElement()?.getClientRects()[0]
            //    const cursorCords = _.last(window.getSelection()?.getRangeAt(0).getClientRects())

            //    editor.getEditorState().read(() => {
            //       if (!$getRoot().getTextContent().length) {
            //          todo.focusDown()
            //          e.preventDefault()
            //          return true
            //       }

            //       if (editorCords && cursorCords) {
            //          const line = Math.floor(
            //             (cursorCords.bottom - cursorCords.height - editorCords.y) / cursorCords.height
            //          )

            //          console.log(editorCords, cursorCords)

            //          // if (line === 0) {
            //          //    const position = window.getSelection()?.getRangeAt(0).startOffset
            //          //    todo.focusCursor("title", position)
            //          //    return true
            //          // }
            //       }
            //    })
            // }
         } else if (e.key === "Backspace") {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
               const range = selection.getRangeAt(0)
               if (range?.startOffset === 0 && range.endOffset === 0) {
                  todo.remove()
                  e.preventDefault()
                  return true
               }
            }
         } else if (e.key === "Tab") {
            if (e.shiftKey) {
               todo.outdent()
            } else {
               todo.indent()
            }

            e.preventDefault()
            return true
         } else if (e.key === "Enter") {
            if (!e.shiftKey) {
               todo.newBelow().focusCursor()

               e.preventDefault()
               return true
            }
            // else if (textOrTitle === "title") {
            //    todo.focusCursor("text")

            //    e.preventDefault()
            //    return true
            // }
         }
      }

      function updateSelection(e: MouseEvent | KeyboardEvent) {
         if (e.target === document.activeElement) {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
               todo.updateLocal({ cursorFocusPosition: selection.getRangeAt(0)?.startOffset })
            }
         }
      }

      const onKeyUp = (e: KeyboardEvent, editor: LexicalEditor) => {
         updateSelection(e)

         editor.getEditorState().read(() => {
            if ($getRoot().getTextContent().includes(":")) {
               if (!todo.isHeader) {
                  todo.update({ isHeader: true })
               }
            } else {
               if (todo.isHeader) {
                  todo.update({ isHeader: false })
               }
            }
         })
      }

      const onClick = (e: MouseEvent) => {
         todo.focusCursor(textOrTitle)
         updateSelection(e)
      }

      return (
         <LexicalEditorComponent
            onClick={onClick}
            onTextUpdate={onTextUpdate}
            onKeyUp={onKeyUp}
            onTextFocus={onTextFocus}
            onKeyDown={onKeyDown}
         />
      )
   } else {
      const [editor] = useLexicalComposerContext()
      useEffect(() => {
         if (JSON.stringify(editor.getEditorState().toJSON()) !== todo[textOrTitle]) {
            editor.update(() => {
               const parsedEditorState = editor.parseEditorState(todo[textOrTitle])
               editor.setEditorState(parsedEditorState)
            })
         }
      }, [todo[textOrTitle]])

      return <LexicalEditorComponent />
   }
}
