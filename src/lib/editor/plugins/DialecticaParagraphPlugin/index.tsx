import {
   $getNodeByKey,
   $getSelection,
   $isParagraphNode,
   COMMAND_PRIORITY_HIGH,
   DOMExportOutput,
   EditorConfig,
   ElementNode,
   KEY_DOWN_COMMAND,
   LexicalEditor,
   LexicalNode,
   NodeKey,
   ParagraphNode,
   SerializedLexicalNode,
   SerializedParagraphNode,
   Spread,
} from "lexical"
import { uuidv4 } from "@firebase/util"
import { CardLocationType, CardRecord, cardStore, LexicalParagraphData } from "../../../card.data"
import { IReactionDisposer, makeObservable, reaction, runInAction } from "mobx"
import _ from "lodash"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useEffect, useRef } from "react"
import { boardStore } from "../../../board.data"
import { getUser } from "../../../useUser"
import { mergeRegister } from "@lexical/utils"

export type SerializedDialecticaParagraphNode = Spread<
   {
      id: string
   },
   SerializedLexicalNode
>

function getParagraphParent<T = LexicalNode>(node: T & { getParent?: () => T | null }): DialecticaParagraphNode | null {
   if ($isParagraphNode(node as any)) return node as unknown as DialecticaParagraphNode
   if (!node.getParent) return null

   return getParagraphParent(node.getParent() as any)
}

export class DialecticaParagraphNode extends ParagraphNode {
   paragraphData: LexicalParagraphData

   card?: CardRecord

   deregisterFn?: IReactionDisposer

   constructor(id: string, paragraphData?: LexicalParagraphData, key?: NodeKey, card?: CardRecord) {
      super(key)
      const editorId = card?.localNonObserved.lexicalEditor?._config.theme.id

      this.paragraphData = paragraphData || makeObservable(new LexicalParagraphData(id, editorId))
      this.paragraphData.editorId = editorId

      this.card = card
   }

   static getType(): string {
      return "dialectica-paragraph"
   }

   static clone(node: DialecticaParagraphNode): DialecticaParagraphNode {
      return new DialecticaParagraphNode(node.paragraphData.id, node.paragraphData, node.__key, node.card)
   }

   static importJSON(serializedNode: SerializedDialecticaParagraphNode | SerializedParagraphNode) {
      // @ts-ignore
      const node = $createDialecticaParagraphNode(serializedNode.id || uuidv4())
      return node
   }

   findParagraphDataInCard() {
      return this.card?.local.lexicalParagraphs.find(
         (p) => p.id === this.paragraphData.id && p.editorId === this.paragraphData.editorId
      )
   }

   remove(preserveEmptyParent?: boolean | undefined) {
      console.log("removed", this.__key)
      runInAction(() => {
         // This is the way it is because the same paragraph node can be
         // re-instantiated multiple times across different editors
         const paragraphData = this.findParagraphDataInCard()
         if (this.card && paragraphData) {
            _.remove(this.card.local.lexicalParagraphs, this.findParagraphDataInCard())
         }
      })
      return super.remove(preserveEmptyParent)
   }

   updateDOM(prevNode: ParagraphNode, dom: HTMLElement, config: EditorConfig): boolean {
      return false
   }

   onChange(editor: LexicalEditor) {
      // todo: could be made more efficient (runs on every paragraph every time there's a change)
      const dom = editor.getElementByKey(this.getKey())
      if (!dom || !this.card) return

      // update has-related
      // if (this.card.type === CardBoardType.PARAGRAPH) {
      //    dom.className += " bracket-borders"
      // } else {
      const hasRelatedCards = this.card.relatedParagraphCards.some(
         (c) => c.show && c.paragraphId === this.paragraphData.id
      )

      if (hasRelatedCards) {
         if (!dom.className.includes("bracket-borders")) {
            dom.className += " bracket-borders"
         }
      } else if (dom.className.includes("bracket-borders")) {
         dom.className = dom.className.replace("bracket-borders", "")
         dom.style.removeProperty("margin")
      }
      // }

      this.updateCoords(dom)
   }

   updateCoords(dom: HTMLElement) {
      // Update the coordinate informations stored in card.local.paragraphData
      runInAction(() => {
         this.paragraphData.paragraphHeight = dom.offsetHeight
         const margin = parseFloat(dom.style.marginTop)
         this.paragraphData.paragraphY = dom.offsetTop - (Number.isNaN(margin) ? 0 : margin)
      })
   }

   createDOM(config: EditorConfig, editor?: LexicalEditor) {
      const dom = super.createDOM(config)
      dom.setAttribute("data-lexical-dialectica-paragraph-id", this.paragraphData.id)

      if (config.namespace === "ReadOnlyEditor") {
         return dom
      }

      dom.onclick = (e) => {
         const x = e.offsetX
         const width = (e.currentTarget as HTMLElement).clientWidth

         if (x > width) {
            $insertDialecticaParagraphNode(this.card!)
         }
      }

      if (!this.card) {
         this.card = config.theme.card
      }

      if (editor) {
         // check to see if it's been copy pasted and this paragraph is "already in"
         const nodes = editor.getEditorState()._nodeMap
         const alreadyIn = Array.from(nodes.values()).some((node) => {
            if (!$isDialecticaParagraphNode(node)) return false
            if (!editor.getElementByKey(node.getKey())) return false
            return node.paragraphData.id === this.paragraphData.id
         })
         if (alreadyIn) {
            this.paragraphData.id = uuidv4()
         }

         this.registerRelatedCardHeightListener(editor)

         // add node to card "paragraph data" array
         const card = this.card as CardRecord
         this.paragraphData.editorId = editor._config.theme.id

         if (!this.findParagraphDataInCard()) {
            runInAction(() => {
               card.local.lexicalParagraphs.push(this.paragraphData)
            })
         }
      }

      return dom
   }

   registerRelatedCardHeightListener(editor: LexicalEditor) {
      // if (!this.deregisterFn) {
      // this.deregisterFn =
      // todo: figure out how to handle deregister (get's weird once you hide and show text)

      // set the margin whenever the  "relatedCardsHeight" changes
      reaction(
         () => this.paragraphData.relatedCardsHeight,
         (relatedCardsHeight) => {
            const dom = editor.getElementByKey(this.getKey())
            if (!dom) return
            if (relatedCardsHeight !== undefined) {
               let margin = (relatedCardsHeight - dom.offsetHeight) / 2
               if (margin < 0) margin = 0

               dom.style.margin = `${margin}px 0px`
               this.onChange(editor)

               // update all pagraphraphs after this one
               if (editor) {
                  editor.update(() => {
                     let sib = this.getNextSibling()
                     while (sib) {
                        const sibDom = editor?.getElementByKey(sib.getKey())
                        if ($isDialecticaParagraphNode(sib) && sibDom) {
                           sib.updateCoords(sibDom)
                        }
                        sib = sib.getNextSibling()
                     }
                  })
               }
            }
         }
      )
      // }
   }

   exportJSON() {
      const json = super.exportJSON()
      return {
         ...json,
         id: this.paragraphData.id,
         type: "dialectica-paragraph",
      }
   }

   static importDOM() {
      return {
         p: (domNode: HTMLElement) => {
            if (!domNode.hasAttribute("data-lexical-dialectica-paragraph-id")) {
               return null
            }
            return {
               conversion: () => {
                  const id = domNode.getAttribute("data-lexical-dialectica-paragraph-id") as string
                  const node = $createDialecticaParagraphNode(id)
                  return { node }
               },
               priority: 2 as 2, //🙄
            }
         },
      }
   }

   exportDOM(): DOMExportOutput {
      const element = document.createElement("p")
      element.setAttribute("data-lexical-dialectica-paragraph-id", this.paragraphData.id)
      return { element }
   }
}

export function $insertDialecticaParagraphNode(card: CardRecord) {
   if (card.isMine) return

   if (!card.localNonObserved.lexicalEditor) {
      console.error("No editor on card", card.id)
      return
   }

   const editor = card.localNonObserved.lexicalEditor
   editor.update(() => {
      const node = $getSelection()?.getNodes()[0]
      if (!node) return

      const paragraphParent = getParagraphParent(node as ElementNode)
      if (!paragraphParent) {
         throw new Error("how?")
      }

      const userId = getUser().uid

      const peers = card.relatedParagraphCards.filter((p) => p.parentId === paragraphParent.paragraphData.id)

      cardStore
         .create({
            boardId: boardStore.currentSelected!.id,
            order: peers.length,
            ownerUserId: userId,
            paragraphParentCardId: card.id,
            paragraphId: paragraphParent.paragraphData.id,
            parentId: null,
            treeUserId: userId,
            cardLocationType: CardLocationType.PARAGRAPH,
            cardIntentionTypeId: "PARAPHRASE",
         })
         .focusCursor("text")

      paragraphParent.onChange(editor)
   })
}

export function $createDialecticaParagraphNode(id: string): DialecticaParagraphNode {
   return new DialecticaParagraphNode(id)
}

export function $isDialecticaParagraphNode(node: LexicalNode | null | undefined): node is DialecticaParagraphNode {
   return node instanceof DialecticaParagraphNode
}

export default function DialecticaParagraphPlugin() {
   const [editor] = useLexicalComposerContext()

   const map = useRef<Map<NodeKey, DialecticaParagraphNode>>(new Map())

   useEffect(() => {
      return mergeRegister(
         editor.registerMutationListener(DialecticaParagraphNode, (nodeMutations) => {
            editor.getEditorState().read(() => {
               for (const [nodeKey, mutation] of nodeMutations) {
                  if (mutation === "updated" || mutation === "created") {
                     const node = $getNodeByKey(nodeKey) as DialecticaParagraphNode
                     if (node) {
                        map.current.set(nodeKey, node)
                     }
                  } else if (mutation === "destroyed") {
                     const node = map.current.get(nodeKey)
                     if (node && node.deregisterFn) {
                        node.deregisterFn()
                     }
                  }
               }
            })
         }),

         editor.registerUpdateListener(({ editorState, prevEditorState }) => {
            Array.from(editorState._nodeMap.values()).forEach((n) => {
               if ($isDialecticaParagraphNode(n)) {
                  n.onChange(editor)
               }
            })
         }),

         editor.registerCommand(
            KEY_DOWN_COMMAND,
            (e: KeyboardEvent) => {
               if (e.key === "`") {
                  e.preventDefault()
                  $insertDialecticaParagraphNode(editor._config.theme.card)
               }

               return false
            },
            COMMAND_PRIORITY_HIGH
         )
      )
   }, [editor])

   return null
}
