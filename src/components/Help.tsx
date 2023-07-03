import { observer } from "mobx-react"
import { BoardRecord } from "../lib/board.data"
import React, { useState } from "react"
import ReactMarkdown from "react-markdown"
import ReactDom from "react-dom"
import remarkGfm from "remark-gfm"
import rehype from "rehype-raw"

import helpText from "./help-text.md?raw"
import { userStore } from "../lib/user.data"
import _ from "lodash"
import { KeyMapKey, allHotkeys, commandName } from "../lib/hotkeys"

const Command = observer(function Command({ id }: { id: KeyMapKey }) {
   if (!allHotkeys[id]) {
      throw new Error("Could not find command " + id)
   }
   return <span>{commandName(id)}</span>
})

const Shortcut = observer(function Shortcut({ id }: { id: KeyMapKey }) {
   if (!allHotkeys[id]) {
      throw new Error("Could not find shortcut " + id)
   }
   return <span>{allHotkeys[id].shortcut}</span>
})

const Section = observer(function Section({ children, id }: { id: KeyMapKey; children: JSX.Element[] }) {
   const user = userStore.getUserRecord()

   const uiData = user.helpUIData || { collapsedSections: [] }

   const collapsed = uiData.collapsedSections.includes(id)

   const onClick = () => {
      let collapsedSections = uiData.collapsedSections
      if (collapsedSections.includes(id)) {
         collapsedSections = _.without(uiData.collapsedSections, id)
      } else {
         collapsedSections = [...collapsedSections, id]
      }

      user.update({ helpUIData: { ...uiData, collapsedSections } })
   }

   return (
      <div onClick={onClick} className={`section ${collapsed ? "collapsed" : ""}`}>
         {children}
      </div>
   )
})

function HelpComponent() {
   return (
      <div className="help scrollable">
         <ReactMarkdown
            children={helpText}
            rehypePlugins={[rehype]}
            components={{
               // @ts-ignore
               section: Section,
               shortcut: Shortcut,
               command: Command,
            }}
            remarkPlugins={[remarkGfm]}
         ></ReactMarkdown>
      </div>
   )
}

export const Help = observer(HelpComponent)
