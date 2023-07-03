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
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { TextNode } from "lexical"
import { createRef, useEffect, useState } from "react"
import useLayoutEffect from "../../shared/useLayoutEffect"
import { observer } from "mobx-react"
import { makeAutoObservable, runInAction, trace } from "mobx"
import NodeList, { getNodeList } from "../../nodes/NodeList"

enum Answer {
   YES = "YES",
   NO = "NO",
   REJECT = "REJECT",
   UNANSWERED = "UNANSWERED",
}

const AnswerConfig = {
   [Answer.YES]: { color: "bg-green-300", name: "Seems Yes" },
   [Answer.NO]: { color: "bg-red-300", name: "Seems No" },
   [Answer.REJECT]: { color: "bg-slate-200", name: "Reject Premise" },
   [Answer.UNANSWERED]: { color: "bg-slate-200 text-italics", name: "Unanswered" },
}

type Config = {
   question: string | null
   answer: Answer | null
}

export type SerializedQuestionNode = Spread<
   {
      config: Config
   },
   SerializedLexicalNode
>

class QuestionUIState {
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
   onClick,
   readonly,
}: {
   uiState: QuestionUIState
   value: string
   className?: string
   onChange: React.ChangeEventHandler
   onClick?: React.MouseEventHandler
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
            onMouseDown={onClick}
            onClick={(e) => {
               e.preventDefault
            }}
            onMouseUp={(e) => {
               e.preventDefault
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

function QuestionComponent({ node }: { node: QuestionNode }) {
   const { question } = node.config
   const answer = node.config.answer || Answer.UNANSWERED

   const [editor] = useLexicalComposerContext()

   const value = question || ""

   const [showOptions, setShowOptions] = useState(false)

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

   function updateConfig({ question, answer }: Partial<Config>) {
      editor.update(() => {
         const writableNode = node.getWritable()

         if (question) writableNode.config.question = question

         if (answer) writableNode.config.answer = answer
      })
   }

   const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      runInAction(() => {
         node.uiState.setCursor(e.target.selectionStart || 0)
         node.uiState.dirty = true
         node.uiState.highlightedLine = 0
      })

      // clear answerId once we start inputting
      updateConfig({ question: e.target.value, answer: null })
   }

   function onSelect(answer: Answer) {
      updateConfig({ answer })
      setShowOptions(false)
   }

   function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (!e.altKey && e.key !== "Home" && e.key !== "End") {
         e.stopPropagation()
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

   return (
      <span
         className={`question relative whitespace-nowrap `}
         onClick={() => {
            if (!value.length) {
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
         <span className="cursor-text" onClick={moveLeft}>
            [
         </span>
         <AutosizeInput
            readonly={!editor.isEditable()}
            value={value}
            uiState={node.uiState}
            onChange={onInputChange}
            inputRef={node.contentEditableRef}
         />
         <span className="cursor-text" onClick={moveRight}>
            ?
         </span>

         <span className="relative ml-1">
            <span
               className={`cursor-pointer px-1 border border-1 border-black ${AnswerConfig[answer as Answer].color}`}
               onClick={() => setShowOptions(true)}
            >
               {answer ? AnswerConfig[answer].name : "Unanswered"}
            </span>

            {!showOptions ? null : (
               <span className="absolute left-0 bottom-0">
                  <span className="fixed flex flex-col border border-black bg-white z-[999] cursor-pointer border-b-0">
                     {Object.keys(Answer).map((answer) => (
                        <span
                           key={answer}
                           onMouseDown={() => onSelect(Answer[answer as Answer])}
                           className={`hover:brightness-125 border-b border-black px-1 ${
                              AnswerConfig[answer as Answer].color
                           }`}
                        >
                           {AnswerConfig[answer as Answer].name}
                        </span>
                     ))}
                  </span>
               </span>
            )}
         </span>
         <span>]</span>
      </span>
   )
}

const QuestionComponentObserver = observer(QuestionComponent)

export class QuestionNode extends DecoratorNode<JSX.Element> {
   config: Config
   uiState: QuestionUIState
   contentEditableRef: React.RefObject<HTMLInputElement>

   static getType(): string {
      return "question"
   }

   static clone(node: QuestionNode): QuestionNode {
      return new QuestionNode(node.config, node.__key, node.uiState)
   }

   static importJSON(serializedNode: SerializedQuestionNode): QuestionNode {
      const node = $createQuestionNode(serializedNode.config)
      return node
   }

   constructor(config: Config, key?: NodeKey, uiState?: QuestionUIState) {
      super(key)
      this.config = config
      this.uiState = uiState || new QuestionUIState()
      this.contentEditableRef = createRef<HTMLInputElement>()
   }

   getTextContent() {
      return "?[" + (this.config.question || " ") + "]"
   }

   exportJSON(): SerializedQuestionNode {
      return {
         config: this.config,
         type: "question",
         version: 1,
      }
   }

   static importDOM() {
      return {
         span: (domNode: HTMLElement) => {
            if (!domNode.hasAttribute("data-lexical-question-config")) {
               return null
            }
            return {
               conversion: () => {
                  const config = domNode.getAttribute("data-lexical-question-config") as string
                  const node = $createQuestionNode(JSON.parse(config))
                  return { node }
               },
               priority: 2,
            }
         },
      }
   }

   exportDOM(): DOMExportOutput {
      const element = document.createElement("span")
      element.setAttribute("data-lexical-question-config", JSON.stringify(this.config))
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
      return <QuestionComponentObserver node={this} />
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

export function $createQuestionNode(config: Config): QuestionNode {
   return new QuestionNode(config)
}

export function $isQuestionNode(node: LexicalNode | null | undefined): node is QuestionNode {
   return node instanceof QuestionNode
}

function findAndTransformQuestion(node: TextNode) {
   const text = node.getTextContent()

   const questions = text.match(/\?\[/)

   if (questions?.length && questions.index !== undefined) {
      const result = node.splitText(questions.index, questions.index + 2)

      const toReplace = result[1] || result[0] // array will only have one entry if there is no additional text

      const QuestionsNode = $createQuestionNode({ question: "", answer: null })
      toReplace.replace(QuestionsNode)

      QuestionsNode.$select()
   }
}

function useQuestions(editor: LexicalEditor): void {
   if (editor._config.namespace === "ReadOnlyEditor") return

   useEffect(() => {
      return editor.registerNodeTransform(TextNode, (node) => findAndTransformQuestion(node))
   }, [editor])
}

export default function QuestionsPlugin(): JSX.Element | null {
   const [editor] = useLexicalComposerContext()
   useQuestions(editor)

   useLayoutEffect(() => {
      return editor.registerUpdateListener(({ editorState, prevEditorState }) => {
         editor.update(() => {
            const current = $getSelection()
            const nodes = current?.getNodes()

            prevEditorState.read(() => {
               const previous = $getSelection()

               if (!$isNodeSelection(current)) return

               if (nodes?.length === 1 && $isQuestionNode(nodes[0]) && $isRangeSelection(previous)) {
                  const Question = nodes[0]
                  const linkIsNew = $getNodeByKey(Question.__key) === null

                  const prevNode = previous.anchor.getNode()
                  const atStart = prevNode.__key === "1" && previous.anchor.offset === 0

                  if (atStart || linkIsNew || prevNode.isBefore(Question)) {
                     Question.focus("start")
                  } else {
                     Question.focus("end")
                  }
               }
            })
         })
      })
   }, [editor])

   return null
}

export function getQuestions(nodes: string | EditorState): QuestionNode[] {
   const editor = createEditor({
      nodes: getNodeList("Card"),
   })

   nodes = typeof nodes === "string" ? editor.parseEditorState(nodes) : nodes

   return Array.from(nodes._nodeMap.values()).filter((node) => $isQuestionNode(node)) as QuestionNode[]
}
