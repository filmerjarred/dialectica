/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { CharacterLimitPlugin } from "@lexical/react/LexicalCharacterLimitPlugin"
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin"
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin"
import { useEffect, useState } from "react"

import { useSettings } from "./context/SettingsContext"
import { SharedHistoryContext, useSharedHistoryContext } from "./context/SharedHistoryContext"
import AutocompletePlugin from "./plugins/AutocompletePlugin"
import AutoLinkPlugin from "./plugins/AutoLinkPlugin"
import ClickableLinkPlugin from "./plugins/ClickableLinkPlugin"
import CollapsiblePlugin from "./plugins/CollapsiblePlugin"
import DragDropPaste from "./plugins/DragDropPastePlugin"
import ImagesPlugin from "./plugins/ImagesPlugin"
import LinkPlugin from "./plugins/LinkPlugin"
import ListMaxIndentLevelPlugin from "./plugins/ListMaxIndentLevelPlugin"
import MarkdownShortcutPlugin from "./plugins/MarkdownShortcutPlugin"
import { MaxLengthPlugin } from "./plugins/MaxLengthPlugin"
import TabFocusPlugin from "./plugins/TabFocusPlugin"
import { TableContext } from "./plugins/TablePlugin"
import TwitterPlugin from "./plugins/TwitterPlugin"
import YouTubePlugin from "./plugins/YouTubePlugin"
import { CAN_USE_DOM } from "./shared/canUseDOM"
import ContentEditable from "./ui/ContentEditable"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { COMMAND_PRIORITY_HIGH, EditorState, KEY_DOWN_COMMAND, LexicalEditor } from "lexical"
import WikiLinksPlugin from "./plugins/WikiLinksPlugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { SharedAutocompleteContext } from "./context/SharedAutocompleteContext"
import QuestionsPlugin from "./plugins/QuestionPlugin"
import DialecticaParagraphPlugin from "./plugins/DialecticaParagraphPlugin"
import DialecticaSentencePlugin from "./plugins/DialecticaSentencePlugin"

export interface LexicalEditorProps {
   placeholder?: string
   onClick?: (...arg: any[]) => any
   onMouseDown?: (...arg: any[]) => any
   onKeyUp?: (...arg: any[]) => any
   onTextUpdate?: (...arg: any[]) => any
   onTextFocus?: (...arg: any[]) => any
   onBlur?: (...arg: any[]) => any
   onKeyDown?: (e: KeyboardEvent, editor: LexicalEditor) => any
}

export default function Editor({
   placeholder,
   onTextUpdate,
   onClick,
   onMouseDown,
   onTextFocus,
   onKeyUp,
   onKeyDown,
   onBlur,
}: LexicalEditorProps): JSX.Element {
   const [editor] = useLexicalComposerContext()
   const { historyState } = useSharedHistoryContext()
   const isCollab = false
   const {
      settings: {
         isAutocomplete,
         isMaxLength,
         isCharLimit,
         isCharLimitUtf8,
         isRichText,
         showTreeView,
         showTableOfContents,
      },
   } = useSettings()
   const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null)
   const [isSmallWidthViewport, setIsSmallWidthViewport] = useState<boolean>(false)

   const onRef = (_floatingAnchorElem: HTMLDivElement) => {
      if (_floatingAnchorElem !== null) {
         setFloatingAnchorElem(_floatingAnchorElem)
      }
   }

   useEffect(() => {
      const updateViewPortWidth = () => {
         const isNextSmallWidthViewport = CAN_USE_DOM && window.matchMedia("(max-width: 1025px)").matches

         if (isNextSmallWidthViewport !== isSmallWidthViewport) {
            setIsSmallWidthViewport(isNextSmallWidthViewport)
         }
      }

      window.addEventListener("resize", updateViewPortWidth)

      return () => {
         window.removeEventListener("resize", updateViewPortWidth)
      }
   }, [isSmallWidthViewport])

   const onTextUpdateChange = onTextUpdate
      ? (editorState: EditorState, editor: LexicalEditor) => {
           onTextUpdate(editorState.toJSON())
        }
      : undefined

   if (onKeyDown) {
      useEffect(
         () =>
            editor.registerCommand(
               KEY_DOWN_COMMAND,
               (e: KeyboardEvent) => {
                  return onKeyDown(e, editor) || false
               },
               COMMAND_PRIORITY_HIGH
            ),
         []
      )
   }

   return (
      <SharedHistoryContext>
         <TableContext>
            <SharedAutocompleteContext>
               <div
                  className={`${editor._config.namespace === "ReadOnlyEditor" ? "" : "text"} editor-shell`}
                  onClick={onClick}
                  onMouseDown={onMouseDown}
               >
                  <div className="title-border"></div>

                  {isMaxLength && <MaxLengthPlugin maxLength={30} />}
                  <DragDropPaste />

                  {/* <ComponentPickerPlugin /> */}
                  {/* <HashtagPlugin /> */}
                  <WikiLinksPlugin />
                  <QuestionsPlugin />

                  <DialecticaSentencePlugin />
                  <DialecticaParagraphPlugin />

                  {/* <KeywordsPlugin /> */}
                  <OnChangePlugin
                     ignoreSelectionChange={true}
                     ignoreHistoryMergeTagChange={true}
                     // @ts-ignore
                     onChange={onTextUpdateChange}
                  />
                  <AutoLinkPlugin />
                  {/* <CommentPlugin /> */}

                  <HistoryPlugin externalHistoryState={historyState} />
                  <RichTextPlugin
                     contentEditable={
                        <div
                           className="editor"
                           onDragStart={(e) => {
                              // e.preventDefault()
                              // e.stopPropagation()
                           }}
                           // draggable={true}
                           onBlur={onBlur}
                           onKeyUp={(e) => (onKeyUp ? onKeyUp(e, editor) : null)}
                           onClick={onTextFocus}
                           ref={onRef}
                        >
                           <ContentEditable />
                        </div>
                     }
                     placeholder={
                        placeholder ? (
                           <span style={{ opacity: 0.5, top: 0, padding: 20, position: "absolute" }}>
                              {placeholder}
                           </span>
                        ) : null
                     }
                     ErrorBoundary={LexicalErrorBoundary}
                  />
                  <MarkdownShortcutPlugin />
                  {/* <CodeHighlightPlugin /> */}
                  <ListPlugin />
                  <CheckListPlugin />
                  <ListMaxIndentLevelPlugin maxDepth={7} />
                  {/* <TablePlugin /> */}
                  {/* <TableCellResizer /> */}
                  <ImagesPlugin />
                  <LinkPlugin />
                  {/* <PollPlugin /> */}
                  <TwitterPlugin />
                  <YouTubePlugin />
                  {/* <FigmaPlugin /> */}
                  <ClickableLinkPlugin />
                  {/* {floatingAnchorElem ? <FloatingLinkEditorPlugin anchorElem={floatingAnchorElem} /> : null} */}
                  {/* <HorizontalRulePlugin /> */}
                  {/* <ExcalidrawPlugin /> */}
                  <TabFocusPlugin />
                  <TabIndentationPlugin />
                  <CollapsiblePlugin />
                  {/* {floatingAnchorElem && !isSmallWidthViewport && (
               <>
                  <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />
                  <FloatingLinkEditorPlugin anchorElem={floatingAnchorElem} />
                  <TableCellActionMenuPlugin anchorElem={floatingAnchorElem} cellMerge={true} />
                  <FloatingTextFormatToolbarPlugin anchorElem={floatingAnchorElem} />
               </>
            )} */}

                  {(isCharLimit || isCharLimitUtf8) && (
                     <CharacterLimitPlugin charset={isCharLimit ? "UTF-16" : "UTF-8"} maxLength={5} />
                  )}
                  {isAutocomplete && <AutocompletePlugin />}
               </div>
            </SharedAutocompleteContext>
         </TableContext>
      </SharedHistoryContext>
   )
}
