import { LexicalComposer } from "@lexical/react/LexicalComposer"
import Editor from "../lib/editor/LexicalEditor"
import PlaygroundEditorTheme from "../lib/editor/themes/PlaygroundEditorTheme"
import LexicalEditorComponent from "../lib/editor/LexicalEditor"
import { getNodeList } from "../lib/editor/nodes/NodeList"
import { useEffect, useState } from "react"
import { ReadOnlyEditor } from "./ReadOnlyEditor"
import { lexicalToText } from "../lib/lexicalToText"
import { LexicalEditor } from "lexical"
import { send } from "../lib/cloud-function"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { uiStore } from "../lib/ui.data"
import { toast } from "react-toastify"
const noop = () => {}

export function FeedBack() {
   const initialConfig = {
      namespace: "Feedback",
      nodes: getNodeList("Feedback"),
      onError: (error: Error) => {
         throw error
      },
      theme: PlaygroundEditorTheme,
   }

   return (
      <div
         style={{
            width: "100%",
            height: "100%",
            background: "#80808040",
            position: "absolute",
            zIndex: 999999,
         }}
      >
         <div className="feedback centerize relative" style={{ width: 500, opacity: 1, border: "1px solid black" }}>
            <LexicalComposer initialConfig={initialConfig}>
               <FeedbackEditor></FeedbackEditor>
            </LexicalComposer>
         </div>
      </div>
   )
}

export function FeedbackEditor() {
   const [editor] = useLexicalComposerContext()

   function submit() {
      const editorState = editor.getEditorState()
      uiStore.toggleShowFeedback(false)

      try {
         send("feedback", { feedback: lexicalToText(editorState) })
         toast("Feedback submitted, thank you!")
      } catch (e) {
         throw e
      }
   }

   const onKeyDown = (e: KeyboardEvent, editor: LexicalEditor) => {
      if (e.key === "Enter") {
         e.preventDefault()
         submit()
      }
   }

   return (
      <>
         <LexicalEditorComponent
            placeholder="I wish it did..."
            onBlur={noop}
            onClick={noop}
            onKeyDown={onKeyDown}
            onTextFocus={noop}
            onTextUpdate={noop}
         ></LexicalEditorComponent>

         <div
            className="absolute right-[10px] top-[10px] cursor-pointer"
            onClick={() => uiStore.toggleShowFeedback(false)}
         >
            <i className="fas fa-times"></i>
         </div>

         <div className="w-full bg-white p-2 flex">
            <button className="flex-1 mr-1 bg-rose-100" onClick={() => uiStore.toggleShowFeedback(false)}>
               Cancel
            </button>
            <button className="flex-1 ml-1 bg-emerald-100" onClick={submit}>
               Submit
            </button>
         </div>
      </>
   )
}
