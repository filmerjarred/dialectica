import {
   $createNodeSelection,
   $getNodeByKey,
   $getRoot,
   $getSelection,
   $isNodeSelection,
   $isRangeSelection,
   $setSelection,
   createEditor,
   DecoratorNode,
   DOMExportOutput,
   EditorState,
   LexicalEditor,
   LexicalNode,
   NodeKey,
   SerializedLexicalNode,
   Spread,
} from "lexical"
import Fuse from "fuse.js"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { TextNode } from "lexical"
import { createRef, useEffect, useState } from "react"
import { boardStore } from "../../../board.data"
import useLayoutEffect from "../../shared/useLayoutEffect"
import { CardRecord, cardStore } from "../../../card.data"
import { observer } from "mobx-react"
import { makeAutoObservable, runInAction } from "mobx"
import NodeList, { getNodeList } from "../../nodes/NodeList"
import { useDrag } from "react-dnd"
import { DragAndDropTypes } from "../../../../components/Board"

type Config = {
   searchString: string | null
   cardId: string | null
}

export type SerializedWikiLinkNode = Spread<
   {
      config: Config
   },
   SerializedLexicalNode
>

class WikiLinkUIState {
   dirty: boolean = false
   focused: boolean = false
   highlightedLine: number = 0
   cursor: number = 0

   constructor() {
      makeAutoObservable(this)
   }

   setFocused(focused: boolean) {
      this.focused = focused
   }

   setDirty(dirty: boolean) {
      this.dirty = dirty
   }

   setCursor(cursor: number) {
      this.cursor = cursor
   }

   setHighlightedLine(highlightedLine: number) {
      this.highlightedLine = highlightedLine
   }
}

const AutosizeInput = observer(function AutosizeInput({
   uiState,
   value,
   className,
   onChange,
   inputRef,
   onMouseDown,
   onClick,
   onFocus,
   readonly,
}: {
   uiState: WikiLinkUIState
   value: string
   className?: string
   onChange: React.ChangeEventHandler
   onMouseDown?: React.MouseEventHandler
   onClick?: React.MouseEventHandler
   onFocus?: React.FocusEventHandler
   inputRef: React.RefObject<HTMLInputElement>
   readonly?: boolean
}) {
   useEffect(() => {
      if (inputRef.current) {
         inputRef.current.setSelectionRange(uiState.cursor, uiState.cursor)
      }
   }, [inputRef, value, uiState.cursor])

   return (
      <span style={{ position: "relative", minWidth: 2 }}>
         <input
            readOnly={readonly}
            className={className}
            onMouseDown={onMouseDown}
            onFocus={onFocus}
            onClick={onClick}
            onMouseUp={(e) => {
               e.preventDefault()
            }}
            ref={inputRef}
            style={{ position: "absolute", zIndex: 10, outline: "none", width: "100%" }}
            onChange={onChange}
            value={value}
         />
         <span style={{ opacity: 0, display: "inline-block", minWidth: value ? "max-content" : 1 }}>{value}</span>
      </span>
   )
})

function zComponent({ node }: { node: WikiLinkNode }) {
   const { searchString, cardId } = node.config

   const [editor] = useLexicalComposerContext()

   if (editor._config.namespace === "ReadOnlyEditor") {
      return <p>[[{searchString}]]</p>
   }

   const board = boardStore.getCurrentBoard()
   const card = cardId ? cardStore.records.get(cardId) : null

   if (cardId && card === undefined) {
      updateConfig({ searchString: "card-deleted", cardId: null })
      // return <WikiLinkComponentObserver node={node} />
   }

   const dragRef = useDrag(
      () => ({
         type: DragAndDropTypes.WIKILINK,
         item: card,
      }),
      [card]
   )[1]

   const value = !card ? searchString! : card!.title!

   let items: CardRecord[]
   if (card) items = []
   else if (!searchString || !searchString.length) items = board.cards
   else items = new Fuse(board.cards, { keys: ["title"] }).search(searchString!).map((result) => result.item)

   items = items.filter((item) => !!item.title)

   const showDropDown = node.uiState.focused && items.length

   const moveRight = () => {
      if (node.contentEditableRef.current) {
         node.contentEditableRef.current.blur()
      }
      editor.update(() => node.selectNext(0, 0))
   }

   const moveLeft = () => {
      if (node.contentEditableRef.current) {
         node.contentEditableRef.current.blur()
      }
      editor.update(() => node.selectPrevious())
   }

   function onFocus() {
      runInAction(() => (node.uiState.focused = true))
   }

   function updateConfig({ searchString, cardId }: Config) {
      editor.update(() => {
         const writableNode = node.getWritable()
         writableNode.config.searchString = searchString
         writableNode.config.cardId = cardId
      })
   }

   const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      runInAction(() => {
         node.uiState.setCursor(e.target.selectionStart || 0)
         node.uiState.dirty = true
         node.uiState.highlightedLine = 0
      })

      // clear cardId once we start inputting
      updateConfig({ searchString: e.target.value, cardId: null })
   }

   function onSelect(card: CardRecord) {
      updateConfig({ searchString: card.title, cardId: card.id })

      runInAction(() => {
         node.uiState.dirty = false
      })

      moveRight()
   }

   function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (!e.altKey && e.key !== "Home" && e.key !== "End") {
         e.stopPropagation()
      }

      // handle highlight up and down
      if (showDropDown) {
         if (e.key === "ArrowUp") {
            if (node.uiState.highlightedLine > 0) {
               runInAction(() => {
                  node.uiState.highlightedLine = node.uiState.highlightedLine - 1
               })
            }
            e.preventDefault()
         } else if (e.key === "ArrowDown") {
            if (node.uiState.highlightedLine < items.length - 1) {
               runInAction(() => {
                  node.uiState.highlightedLine = node.uiState.highlightedLine + 1
               })
            }
            e.preventDefault()
         }

         // handle selection
         else if (e.key === "Tab" || e.key === "Enter") {
            e.preventDefault()
            if (items[node.uiState.highlightedLine]) onSelect(items[node.uiState.highlightedLine])
         }
      }

      const input = e.target as HTMLInputElement

      const pos = input.selectionStart
      if (e.key === "Backspace" && pos === 0) {
         editor.update(() => {
            node.selectPrevious()
            node.remove()
         })
         e.preventDefault()
      } else if (e.key === "Delete" && pos === value.length) {
         editor.update(() => {
            node.selectNext()
            node.remove()
         })
         e.preventDefault()
      }

      // when focus moves into our element we need to manually control the editor selection
      if (e.key === "ArrowRight" && pos === value.length) {
         e.preventDefault()
         moveRight()
      } else if (e.key === "ArrowLeft" && pos === 0) {
         e.preventDefault()
         moveLeft()
      }
   }

   // function onInputFocus(e: React.FocusEvent) {
   //    if (card) {
   //       e.preventDefault()
   //       e.stopPropagation()
   //       card.centerOnScreen()
   //       node.contentEditableRef.current.blur()
   //    }
   // }

   // function onInputClick(e: React.MouseEvent) {
   // if (card) {
   // }
   // }

   return (
      <span
         className={`wikilink relative whitespace-nowrap`}
         onClick={() => {
            if (!value.length || !card) {
               node.contentEditableRef.current?.focus()
            }
         }}
         onFocus={onFocus}
         onBlur={() => {
            node.uiState.setFocused(false)
            node.uiState.setDirty(false)
         }}
         onKeyDown={onKeyDown}
      >
         <span ref={dragRef}>
            <span className="cursor-text" onClick={moveLeft}>
               [[
            </span>
            {card ? (
               <span
                  className="underline cursor-pointer"
                  onClick={(e) => {
                     card.centerOnScreen()
                     e.preventDefault()
                     e.stopPropagation()
                  }}
               >
                  {card.title}
               </span>
            ) : (
               <AutosizeInput
                  readonly={!editor.isEditable()}
                  value={value}
                  uiState={node.uiState}
                  onChange={onInputChange}
                  inputRef={node.contentEditableRef}
               />
            )}

            <span className="cursor-text" onClick={moveRight}>
               ]]
            </span>
         </span>

         {!showDropDown ? null : (
            <span className="absolute left-0 bottom-0">
               <span className="fixed flex flex-col border-t border-t-black w-[290px] bg-white z-[999]">
                  {items.map((card, index) => {
                     if (!card.title) return null

                     const isHighlighted = index === node.uiState.highlightedLine
                     const className = `cursor-pointer ellipsis p-1 border border-black border-t-0 ${
                        isHighlighted ? "bg-[#00a8df]" : ""
                     }`
                     return (
                        <span
                           onMouseOver={() => node.uiState.setHighlightedLine(index)}
                           onMouseDown={(e) => {
                              onSelect(card)
                           }}
                           className={className}
                           key={index}
                        >
                           {card.title}
                        </span>
                     )
                  })}
               </span>
            </span>
         )}
      </span>
   )
}

const WikiLinkComponentObserver = observer(zComponent)

export class WikiLinkNode extends DecoratorNode<JSX.Element> {
   config: Config
   uiState: WikiLinkUIState
   contentEditableRef: React.RefObject<HTMLInputElement>

   static getType(): string {
      return "wikilink"
   }

   static clone(node: WikiLinkNode): WikiLinkNode {
      return new WikiLinkNode(node.config, node.__key, node.uiState)
   }

   static importJSON(serializedNode: SerializedWikiLinkNode): WikiLinkNode {
      const node = $createWikiLinkNode(serializedNode.config)
      return node
   }

   constructor(config: Config, key?: NodeKey, uiState?: WikiLinkUIState) {
      super(key)
      this.config = config
      this.uiState = uiState || new WikiLinkUIState()
      this.contentEditableRef = createRef<HTMLInputElement>()
   }

   getTextContent() {
      return "[[" + (this.config.searchString || " ") + "]]"
   }

   exportJSON(): SerializedWikiLinkNode {
      return {
         config: this.config,
         type: "wikilink",
         version: 1,
      }
   }

   static importDOM() {
      return {
         span: (domNode: HTMLElement) => {
            if (!domNode.hasAttribute("data-lexical-wikilink-config")) {
               return null
            }
            return {
               conversion: () => {
                  const config = domNode.getAttribute("data-lexical-wikilink-config") as string
                  const node = $createWikiLinkNode(JSON.parse(config))
                  return { node }
               },
               priority: 2,
            }
         },
      }
   }

   exportDOM(): DOMExportOutput {
      const element = document.createElement("span")
      element.setAttribute("data-lexical-wikilink-config", JSON.stringify(this.config))
      return { element }
   }

   createDOM(): HTMLElement {
      const elem = document.createElement("span")
      // elem.contentEditable = true
      elem.setAttribute("contenteditable", "true")

      return elem
   }

   focus(pos: "start" | "end") {
      const input = this.contentEditableRef.current
      if (!input) return

      input.focus()
      if (pos === "start") {
         this.uiState.setCursor(0)
      } else {
         this.uiState.setCursor(input.value.length)
      }
   }

   decorate(): JSX.Element {
      return <WikiLinkComponentObserver node={this} />
   }

   isIsolated() {
      return false
   }

   isKeyboardSelectable() {
      return true
   }

   canInsertTextBefore() {
      return false
   }

   canInsertTextAfter() {
      return false
   }

   isInline() {
      return true
   }

   canBeEmpty() {
      return false
   }

   updateDOM() {
      return false
   }

   $select() {
      const nodeSelection = $createNodeSelection()
      nodeSelection.add(this.__key)
      $setSelection(nodeSelection)
   }
}

export function $createWikiLinkNode(config: Config): WikiLinkNode {
   return new WikiLinkNode(config)
}

export function $isWikiLinkNode(node: LexicalNode | null | undefined): node is WikiLinkNode {
   return node instanceof WikiLinkNode
}

function findAndTransformWikiLink(node: TextNode) {
   const text = node.getTextContent()

   const wikilinks = text.match(/\[\[/)

   if (wikilinks?.length && wikilinks.index !== undefined) {
      const result = node.splitText(wikilinks.index, wikilinks.index + 2)

      const toReplace = result[1] || result[0] // array will only have one entry if there is no additional text

      const wikiLinksNode = $createWikiLinkNode({ searchString: "", cardId: null })
      toReplace.replace(wikiLinksNode)

      wikiLinksNode.$select()
   }
}

function useWikiLinks(editor: LexicalEditor): void {
   if (editor._config.namespace === "ReadOnlyEditor") return

   useEffect(() => {
      return editor.registerNodeTransform(TextNode, (node) => findAndTransformWikiLink(node))
   }, [editor])
}

export default function WikiLinksPlugin(): JSX.Element | null {
   const [editor] = useLexicalComposerContext()
   useWikiLinks(editor)

   useLayoutEffect(() => {
      return editor.registerUpdateListener(({ editorState, prevEditorState }) => {
         editor.update(() => {
            const current = $getSelection()
            const nodes = current?.getNodes()

            prevEditorState.read(() => {
               const previous = $getSelection()

               if (!$isNodeSelection(current)) return

               if (nodes?.length === 1 && $isWikiLinkNode(nodes[0]) && $isRangeSelection(previous)) {
                  const wikiLink = nodes[0]
                  const linkIsNew = $getNodeByKey(wikiLink.__key) === null

                  const prevNode = previous.anchor.getNode()
                  const atStart = prevNode.__key === "1" && previous.anchor.offset === 0

                  if (atStart || linkIsNew || prevNode.isBefore(wikiLink)) {
                     wikiLink.focus("start")
                  } else {
                     wikiLink.focus("end")
                  }
               }
            })
         })
      })
   }, [editor])

   return null
}

export function getWikiLinks(nodes: string | EditorState): WikiLinkNode[] {
   const editor = createEditor({
      nodes: getNodeList("Card"),
   })

   nodes = typeof nodes === "string" ? editor.parseEditorState(nodes) : nodes

   return Array.from(nodes._nodeMap.values()).filter((node) => $isWikiLinkNode(node)) as WikiLinkNode[]
}
