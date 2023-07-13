import {
   $getNodeByKey,
   $getSelection,
   $isTextNode,
   COMMAND_PRIORITY_HIGH,
   DOMExportOutput,
   EditorConfig,
   ElementNode,
   KEY_DOWN_COMMAND,
   LexicalEditor,
   LexicalNode,
   NodeKey,
   SerializedLexicalNode,
   SerializedTextNode,
   Spread,
   TextNode,
} from "lexical"
import { uuidv4 } from "@firebase/util"
import { CardLocationType, CardRecord, cardStore, LexicalSentenceData } from "../../../card.data"
import { IReactionDisposer, makeObservable, reaction, runInAction } from "mobx"
import _ from "lodash"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useEffect, useRef } from "react"
import { boardStore } from "../../../board.data"
import { getUser } from "../../../useUser"
import { mergeRegister } from "@lexical/utils"

export type SerializedDialecticaSentenceNode = Spread<
   {
      id: string
   },
   SerializedTextNode
>

function getSentenceParent<T = LexicalNode>(node: T & { getParent?: () => T | null }): DialecticaSentenceNode | null {
   if ($isTextNode(node as any)) return node as unknown as DialecticaSentenceNode
   if (!node.getParent) return null

   return getSentenceParent(node.getParent() as any)
}

export class DialecticaSentenceNode extends TextNode {
   sentenceData: LexicalSentenceData

   card?: CardRecord

   deregisterFn?: IReactionDisposer

   constructor(text: string, id: string, sentenceData?: LexicalSentenceData, key?: NodeKey, card?: CardRecord) {
      super(text, key)
      const editorId = card?.localNonObserved.lexicalEditor?._config.theme.id

      this.sentenceData = sentenceData || new LexicalSentenceData(id, editorId)
      // this.sentenceData = sentenceData || makeObservable(new LexicalSentenceData(id, editorId))
      this.sentenceData.editorId = editorId

      this.card = card
   }

   sentenceEnd(): number {
      const punctuationRegex = /[\.\?\!](?:\s|$)/ // todo handle quotations
      const match = this.getTextContent().match(punctuationRegex)

      if (!match) return -1
      else return match[0].length + match.index!
   }

   hasSentenceEnd() {
      return this.sentenceEnd() !== -1
   }

   mergeWithSibling(target: DialecticaSentenceNode): TextNode {
      const isBefore = target === this.getPreviousSibling()
      const isAfter = target === this.getNextSibling()

      if ((isBefore && target.hasSentenceEnd()) || (isAfter && this.hasSentenceEnd())) {
         // block merge
         return this
      } else {
         return super.mergeWithSibling(target)
      }
   }

   createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement {
      const dom = super.createDOM(config)

      dom.className += " dialectica-sentence"

      dom.onclick = () => {
         if (!this.card?.isMine) {
            this.card?.updateLocal({ selectedSentenceId: this.sentenceData.id })
         }
      }

      dom.onblur = (e) => {
         const target = e.relatedTarget as HTMLElement

         if (!target) return this.card?.updateLocal({ selectedSentenceId: null })

         if (target.matches(".do-not-blur-sentence")) {
            e.preventDefault()
            dom.focus()
            return
         }

         if (
            this.card?.local.selectedSentenceId === this.sentenceData.id &&
            !target.matches(".card-partners .dialectica-sentence")
         ) {
            console.log("yah")
            this.card?.updateLocal({ selectedSentenceId: null })
         }
      }

      dom.tabIndex = 0

      if (!this.card) {
         this.card = config.theme.card
      }

      if (editor) {
         this.registerReactions(editor)
      }

      return dom
   }

   registerReactions(editor: LexicalEditor) {
      reaction(
         () => this.card?.local.selectedSentenceId,
         (selectedSentenceId) => {
            const dom = editor.getElementByKey(this.getKey())
            if (!dom) return

            const isClassPresent = dom.className.includes("sentence-selected")
            const isSentenceSelected = selectedSentenceId === this.sentenceData.id

            if (isClassPresent && !isSentenceSelected) {
               dom.className = dom.className.replaceAll("sentence-selected", "")
            } else if (!isClassPresent && isSentenceSelected) {
               dom.className += " sentence-selected"
            }

            // if (alreadyIn && (!selectedSentenceId || isSentenceSelected)) {
            //    dom.className = dom.className.replaceAll("unfocus-sentence", "")
            // } else if (!alreadyIn && selectedSentenceId && !isSentenceSelected) {
            //    dom.className += " unfocus-sentence"
            // }
         }
      )
   }

   static getType(): string {
      return "dialectica-sentence"
   }

   static clone(node: DialecticaSentenceNode): DialecticaSentenceNode {
      return new DialecticaSentenceNode(node.__text, node.sentenceData.id, node.sentenceData, node.__key, node.card)
   }

   static importJSON(serializedNode: SerializedDialecticaSentenceNode | SerializedTextNode) {
      const node = $createDialecticaSentenceNode(
         serializedNode.text,
         (serializedNode as SerializedDialecticaSentenceNode).id || uuidv4()
      )
      node.setFormat(serializedNode.format)
      node.setDetail(serializedNode.detail)
      node.setMode(serializedNode.mode)
      node.setStyle(serializedNode.style)
      return node
   }

   isSimpleText(): boolean {
      return this.__type === "dialectica-sentence" && this.__mode === 0
   }

   exportJSON() {
      const json = super.exportJSON()
      return {
         ...json,
         id: this.sentenceData.id,
         type: "dialectica-sentence",
      }
   }

   exportDOM(editor: LexicalEditor): DOMExportOutput {
      const { element } = super.exportDOM(editor)
      element?.setAttribute("data-lexical-dialectica-sentence-id", this.sentenceData.id)
      return { element }
   }
}

export function $createDialecticaSentenceNode(text: string, id: string): DialecticaSentenceNode {
   return new DialecticaSentenceNode(text, id)
}

export function $isDialecticaSentenceNode(node: LexicalNode | null | undefined): node is DialecticaSentenceNode {
   return node instanceof DialecticaSentenceNode
}

export default function DialecticaSentencePlugin() {
   const [editor] = useLexicalComposerContext()

   useEffect(() => {
      return mergeRegister(
         editor.registerNodeTransform(DialecticaSentenceNode, (sentenceNode) => {
            const index = sentenceNode.sentenceEnd()

            if (index !== -1 && index !== sentenceNode.getTextContent().length) {
               sentenceNode.splitText(index)
            }
         })
      )
   }, [editor])

   return null
}
