import { observer } from "mobx-react"
import { memo, useState } from "react"
import { BoardRecord } from "../lib/board.data"
import { TimelineDataChunk } from "../lib/timeline.data"
import { getUser } from "../lib/useUser"
import moment from "moment"
import { userStore } from "../lib/user.data"
import { diffChars, diffWords } from "diff"
import { MessageRecord, messageStore } from "../lib/messages.data"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import Editor from "../lib/editor/LexicalEditor"
import PlaygroundEditorTheme from "../lib/editor/themes/PlaygroundEditorTheme"
import { getLocalLog } from "../lib/localLog"
import LexicalEditorComponent from "../lib/editor/LexicalEditor"
import NodeList, { getNodeList } from "../lib/editor/nodes/NodeList"
import { ReadOnlyEditor } from "./ReadOnlyEditor"
import { LexicalEditor } from "lexical"

const noop = () => {}

function formatTime(rawTime: number) {
   const time = moment(rawTime)

   return `(published ${time.fromNow()})`
}

export const Messages = observer(function Messages({ board }: { board: BoardRecord }) {
   return (
      <div className="messages-panel">
         asdf
         <div className="messages">
            {board.messages.map((message, i) => {
               return (
                  <div key={i} className="message">
                     {/* <ReadOnlyEditor text={JSON.stringify(message.text)}></ReadOnlyEditor> */}
                  </div>
               )
            })}
         </div>
         <div className="messages-editor">
            <MessageEditor board={board}></MessageEditor>
         </div>
      </div>
   )
})

export function MessageEditor({ board }: { board: BoardRecord }) {
   const initialConfig = {
      namespace: "MessageEditor",
      nodes: getNodeList("MessageEditor"),
      onError: (error: Error) => {
         throw error
      },
      theme: PlaygroundEditorTheme,
   }

   const onKeyDown = (e: KeyboardEvent, editor: LexicalEditor) => {
      const user = getUser()

      if (e.key === "Enter") {
         const editorState = editor.getEditorState()
         const json = editorState.toJSON()

         messageStore.create({
            boardId: board.id,
            text: JSON.stringify(json),
            time: Date.now(),
            userId: user.uid,
         })

         e.preventDefault()
      }
   }

   return (
      <LexicalComposer initialConfig={initialConfig}>
         <LexicalEditorComponent
            onBlur={noop}
            onClick={noop}
            onKeyDown={onKeyDown}
            onTextFocus={noop}
            onTextUpdate={noop}
         ></LexicalEditorComponent>
      </LexicalComposer>
   )
}
