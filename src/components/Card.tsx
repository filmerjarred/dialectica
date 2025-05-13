import { useCallback, useEffect, useRef } from "react"
import {
   cardStore,
   CardRecord,
   Side,
   allDescendentAndRoot,
   GutterItem,
   CardMediumType,
   CardLocationType,
   RollControl,
   allAncestors,
} from "../lib/card.data"
import _ from "lodash"
import { useCardContextMenu } from "./CardContextMenu"
import { ArcherElement } from "react-archer"
import "react-quill/dist/quill.snow.css"
import "react-quill/dist/quill.bubble.css"
import { observer } from "mobx-react"
import { useDrag } from "react-dnd"
import { DragAndDropTypes } from "./Board"
import { useDragDropManager } from "react-dnd"
import { Editor } from "./Editor"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { getNodeList } from "../lib/editor/nodes/NodeList"
import PlaygroundEditorTheme from "../lib/editor/themes/PlaygroundEditorTheme"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { uiStore } from "../lib/ui.data"
import { runInAction } from "mobx"
import { useCardDrop } from "../lib/cardDrop"
import { Gutter } from "./Gutter"
import { uuidv4 } from "@firebase/util"

import { SquiggleEditor } from "@quri/squiggle-components"
import {
   getCardBorderArcherId,
   getRelatedCardsCollapseCircleArcherId,
   useArcherRelations,
} from "../lib/useArcherRelations"
import { TagLine } from "./CardIntentionType"
import { Tags } from "./Tags"
import { QuickTagBar } from "./QuickTagBar"
import { FoldController } from "./FoldController"

interface CardProps {
   card: CardRecord
   gutterOwner?: CardRecord
   overhead?: boolean
   isAnchor?: boolean
   isTop?: boolean
   inHotseat?: boolean
   gutterItem?: GutterItem
   gutterSide?: Side
   reactTextWrapperRef: React.RefObject<HTMLDivElement> | null
   side: Side
}

function CardComponent({
   card,
   isTop,
   isAnchor,
   overhead,
   gutterItem,
   inHotseat,
   reactTextWrapperRef,
   gutterSide,
   gutterOwner,
   side,
}: CardProps) {
   const reactTitleRef = useRef<HTMLInputElement>(null)
   const reactCardWrapperRef = useRef<HTMLInputElement>(null)

   const dragDropManager = useDragDropManager()
   const isDragging = dragDropManager.getMonitor().isDragging()

   const [editor] = useLexicalComposerContext()
   card.localNonObserved.lexicalEditor = editor

   // === REGISTER HOOKS START ====

   const dragRef = useDrag(
      () => ({
         type: DragAndDropTypes.CARD,
         item: card,
      }),
      [card]
   )[1]

   const dropRef = !gutterItem
      ? useCardDrop(card, (card) => ({
         order: card.order + 0.1,
         parentId: card.parentId,
      }))[1]
      : null

   const handleContextMenu = useCardContextMenu()

   const portraitClick = useCallback(
      (e: any) => {
         if (card.cardLocationType === CardLocationType.PARAGRAPH) return

         if (e.ctrlKey || e.altKey) {
            const val = !card.local.textCollapsed
            allDescendentAndRoot(card, (c) => c.toggleTextCollapsed(val))
         } else if (gutterSide === Side.RIGHT) {
            gutterOwner!.updateGutterItem(gutterSide!, gutterItem!, { textCollapsed: !gutterItem!.textCollapsed })
         } else {
            card.toggleTextCollapsed()
         }

         // }
         e.stopPropagation()
      },
      [card, gutterItem]
   )

   // HANDLE FOCUS: If card data indicates focus then draw focus to correct element
   const cardRef = useCallback(
      (node: HTMLElement) => {
         if (!node || isTop || overhead || gutterItem) return

         if (card.local.shouldCenterScreen) {
            // debugger
            card.board.localNonObserved.panzoom.centerOnElement(node)
            runInAction(() => {
               card.local.shouldCenterScreen = false
            })
         }

         if (card.local.shouldFocusCursor) {
            if (card.local.shouldFocusCursor === "title") {
               if (reactTitleRef && reactTitleRef.current && document.activeElement !== reactTitleRef.current) {
                  reactTitleRef.current.focus({ preventScroll: true })
                  const position = card.local.cursorFocusPosition || 0

                  reactTitleRef.current.setSelectionRange(position, position)
                  card.local.cursorFocusPosition = undefined
               }
            } else if (card.local.shouldFocusCursor === "text") {
               if (editor.getRootElement() !== document.activeElement) {
                  card.local.cursorFocusPosition = undefined

                  editor.focus(() => { }, { defaultSelection: "rootStart" })
               }
            }

            runInAction(() => {
               card.local.shouldFocusCursor = false
               card.local.cursorFocusPosition = undefined
            })
         }
      },
      [card, card.isSelected, card.local.shouldFocusCursor, card.local.shouldCenterScreen]
   )

   // const webviewRef = useRef(null)
   // useEffect(() => {
   //    if (webviewRef.current) {
   //       webviewRef.current.addEventListener('dom-ready', () => {
   //          webviewRef.current.setZoomLevel(-3)
   //       })
   //    }
   // })

   // useEffect(() => {
   //    const resizeObserver = new ResizeObserver((entries) => {
   //       if (!reactCardWrapperRef.current || !reactTextWrapperRef.current) return

   //       if (entries.length > 0) {
   //          reactCardWrapperRef.current.style.marginBottom = `${reactTextWrapperRef.current?.offsetHeight || 0}px`
   //       }
   //    })

   //    resizeObserver.observe(reactTextWrapperRef.current!)

   //    return () => resizeObserver.disconnect()
   // }, [reactTextWrapperRef.current, reactCardWrapperRef.current])

   const { relations } = useArcherRelations({
      card,
      isAnchor,
      side: isTop ? Side.TOP : side,
      overhead,
      gutterItem,
   })

   // === REGISTER HOOKS END ====

   const updateTitle = (e: any) => card.isMine && !gutterItem && card.update({ updatedTitle: e.target.value })

   let className = `relative card`

   if (card.local.textCollapsed) className += " collapsed"
   if (!card.local.textCollapsed) className += " text-expanded"
   if (card.isSelected) className += " focused"
   if (card.isMine) className += " card-mine"
   if (!card.isMine) className += " card-partners"
   if (isDragging) className += " outline outline-2 outline-amber-200"
   if (card.isAgreed) className += " agreed"
   if (card.isProvisionallyAgreed) className += " provisional-agreed"
   if (card.isCentralPosition) className += " central-position"
   if (overhead) className += " overhead"
   if (inHotseat) className += " card-hotseat"

   if (card.local.rollControlHovered) className += " parent-roll-hovered"

   let cardContentClassName = "card-content"
   if (!card.isMine && card.local.selectedSentenceId) cardContentClassName += " card-sentence-selected"
   if (card.cardLocationType === CardLocationType.PARAGRAPH) cardContentClassName += " paragraph-card min-w-[590px]"
   if (card.cardLocationType !== CardLocationType.PARAGRAPH) cardContentClassName += " board-card min-w-[590px]"
   if (
      card.cardLocationType !== CardLocationType.PARAGRAPH &&
      cardStore.currentSelected &&
      cardStore.currentSelected !== card &&
      !card.relatedParagraphCards.includes(cardStore.currentSelected)
   ) {
      cardContentClassName += " opacity-20"
   }

   return (
      <div
         className={`card-and-gutter-wrapper ${inHotseat ? "hotseat" : ""}`}
         is_card="true" // for use in panzoom
         // @ts-ignore
         ref={cardRef}
         tabIndex={0}
         onBlur={(e) => {
            const target = e.relatedTarget as HTMLElement
            if (!target) return cardStore.setSelected(null)

            if (!target.matches("div[is_card], div[is_card] *")) {
               cardStore.setSelected(null)
            }
         }}
         onClick={(e) => {
            console.log(card)
            if (e.altKey || e.ctrlKey) {
               e.preventDefault()
               e.stopPropagation()
               card.centerOnScreen()
            }
         }}
      >
         {inHotseat ? <Gutter card={card} side={Side.LEFT}></Gutter> : null}

         <div ref={dropRef} className={`card-wrapper ${inHotseat ? "hotseat" : ""}`}>
            <ArcherElement id={getCardBorderArcherId({ card, gutterItem })} relations={relations}>
               <div
                  tabIndex={-1}
                  id={card.id}
                  onContextMenu={(e) => {
                     if (!e.altKey && !e.ctrlKey) {
                        uiStore.setContextMenuCard(card)
                        handleContextMenu(e)
                     }
                  }}
                  onDoubleClick={(e) => {
                     e.preventDefault()
                     e.stopPropagation()
                  }}
                  // @ts-ignores

                  className={className}
               >
                  <div className={`${cardContentClassName} flex flex-col flex-1 `}>
                     {/* top bar */}
                     <span className="card-top-bar">
                        {/* left user pic + tags */}
                        <span ref={dragRef} className="user-and-tags user-and-tags-left">
                           {!isTop ? (
                              <img
                                 className="card-user card-user-owner cursor-pointer double-if-core m-1"
                                 src={card.leftUser.pic}
                                 onClick={portraitClick}
                              ></img>
                           ) : null}

                           {!isTop &&
                              !overhead &&
                              !card.exploded &&
                              !(
                                 // If it's a comment on one of my cards and I haven't given my tags, don't show the OG owners tags
                                 (
                                    card.cardLocationType === CardLocationType.PARAGRAPH &&
                                    !card.isMine &&
                                    !card.partnerTagIds.length
                                 )
                              ) ? (
                              <Tags card={card} tags={card.ownerTagIds} tagsAreMine={card.isMine}></Tags>
                           ) : null}

                           {/* top / we / shared portrait */}
                           {isTop ? (
                              <img
                                 onClick={portraitClick}
                                 className="card-user  cursor-pointer m-1 mr-0"
                                 src={card.leftUser.pic}
                              ></img>
                           ) : null}

                           {isTop && card.rightUser ? (
                              <img
                                 onClick={portraitClick}
                                 className="card-user  cursor-pointer m-1 ml-0"
                                 src={card.rightUser?.pic}
                              ></img>
                           ) : null}
                        </span>

                        {/* central tag line */}
                        <span style={{ fontSize: "9px" }}>
                           <TagLine card={card}></TagLine>
                        </span>

                        {/* right user pic + tags */}
                        {!inHotseat ? (
                           <span
                              className="user-and-tags user-and-tags-right"
                              // style={{ direction: "rtl" }}
                              onClick={portraitClick}
                           >
                              {!isTop && !overhead ? (
                                 <Tags card={card} tags={card.partnerTagIds} tagsAreMine={!card.isMine}></Tags>
                              ) : null}

                              {/* show image if partner has tagged it */}
                              {card.rightUser && card.partnerTagIds.length && !isTop ? (
                                 <img
                                    onClick={portraitClick}
                                    className="card-user  cursor-pointer m-1"
                                    src={card.rightUser?.pic}
                                 ></img>
                              ) : null}
                           </span>
                        ) : null}
                     </span>

                     <div className="title-and-text">
                        {/* title */}
                        {card.cardLocationType !== CardLocationType.PARAGRAPH ? (
                           <span className="flex pb-2 px-1 max-w-[562px]" onClick={(e) => card.focusCursor("title")}>
                              <input
                                 tabIndex={1}
                                 onFocus={(e) => {
                                    // @ts-ignore
                                    if (e.button !== 0) return
                                    !isTop && !overhead && card.handleInputClick("title")
                                 }}
                                 onMouseDown={(e) => {
                                    if (e.button !== 0) return
                                    card.focusCursor("title")
                                 }}
                                 placeholder={"Headline..."}
                                 className={`title ellipsis ${card.local.textCollapsed ? "cursor-pointer" : ""}`}
                                 defaultValue={card.isMine ? card.title : undefined}
                                 value={card.isMine ? undefined : card.title}
                                 readOnly={isTop || overhead || !!gutterItem || !card.isMine}
                                 onChange={updateTitle}
                                 onKeyDown={(e) => {
                                    if (!e.altKey && e.key === "ArrowDown") {
                                       e.preventDefault()
                                       card.handleInputClick("text", (e.target as HTMLInputElement).selectionStart || 0)
                                    }
                                 }}
                                 ref={reactTitleRef}
                              ></input>

                              {gutterSide === Side.RIGHT ? (
                                 <span
                                    className="cursor-pointer"
                                    onClick={() => {
                                       gutterOwner?.removeFromGutter(gutterSide!, gutterItem!)
                                    }}
                                 >
                                    <i className="far fa-window-close"></i>
                                 </span>
                              ) : null}
                           </span>
                        ) : null}

                        {/* text */}
                        <div className="text-wrapper overflow-y-auto overflow-x-hidden" ref={reactTextWrapperRef}>
                           {(() => {
                              if (
                                 isTop ||
                                 overhead ||
                                 (gutterSide === Side.RIGHT ? gutterItem!.textCollapsed : card.local.textCollapsed)
                              )
                                 return

                              if (card.cardMediumType === CardMediumType.FREE_TEXT)
                                 return <Editor cardOrTodo={card} textOrTitle="text"></Editor>

                              if (card.cardMediumType === CardMediumType.SQUIGGLE)
                                 return (
                                    // @ts-ignore
                                    <SquiggleEditor
                                       defaultCode={card.squiggleCode}
                                       onChange={function Ra() { }}
                                       onCodeChange={function Ra(code) {
                                          card.update({ squiggleCode: code })
                                       }}
                                    />
                                 )

                              if (card.cardMediumType === CardMediumType.EMBED)
                                 return (
                                    <>
                                       <input
                                          className="outline-none w-full p-2 ml-3"
                                          placeholder="Url"
                                          defaultValue={card.embedUrl}
                                          onChange={(e) => card.update({ embedUrl: e.target.value })}
                                       ></input>

                                       <Editor cardOrTodo={card} textOrTitle="text"></Editor>


                                       {/* {card.embedUrl ? (
                                          <webview src={card.embedUrl} ref={webviewRef} style={{ height: '700px' }} />
                                       ) : null} */}
                                    </>
                                 )

                              if (card.cardMediumType === CardMediumType.MANIFOLD)
                                 return (
                                    <>
                                       <input
                                          className="outline-none w-full p-2 ml-3"
                                          placeholder="Enter link to market"
                                          defaultValue={card.manifoldUrl}
                                          onChange={(e) => card.update({ manifoldUrl: e.target.value })}
                                       ></input>

                                       {card.manifoldUrl ? (
                                          <iframe
                                             style={{ width: "100%", height: "400px", border: "none" }}
                                             src={addEmbed(card.manifoldUrl)}
                                          />
                                       ) : null}
                                    </>
                                 )
                           })()}
                        </div>

                        {card.children.length && !isTop && !overhead && !inHotseat && !gutterItem ? (
                           <div className={`fade-target children-controls-${side.toLowerCase()}`}>
                              <FoldController side={side} cardOrBoard={card}>
                                 <ArcherElement
                                    id={getRelatedCardsCollapseCircleArcherId({ card, side: isTop ? Side.TOP : side })}
                                 >
                                    <div
                                       className={`control-circle control-circle-small collapsed-children-indicator-${side.toLowerCase()}`}
                                       title="Show / hide child cards"
                                       onClick={(e) => {
                                          if (e.ctrlKey || e.altKey) {
                                             const val = !card.local.relatedCollapsed
                                             allDescendentAndRoot(card, (c) => c.toggleRelatedCollapsed(val))
                                          } else {
                                             card.toggleRelatedCollapsed()
                                          }
                                          e.stopPropagation()
                                       }}
                                    >
                                       {card.local.relatedCollapsed ? <span>...</span> : null}
                                    </div>
                                 </ArcherElement>
                              </FoldController>
                           </div>
                        ) : null}

                        {/* {card.children.length && !isTop && !overhead && !inHotseat && !gutterItem ? (
                           <div className={`card-controls children-controls-${side.toLowerCase()}`}>
                              <div
                                 onClick={(e) => {
                                    card.collapseAllDescendentText()
                                 }}
                                 className={`control-circle control-circle-large mb-[-8px]`}
                              >
                                 <i className="fal fa-chevron-double-up"></i>
                              </div>

                              <div className="flex items-center gap-[4px]">
                                 <div className="flex flex-col gap-[4px]">
                                    <div
                                       onMouseOver={() => card.updateRollAllOutlines(true)}
                                       onMouseLeave={() => card.updateRollAllOutlines(false)}
                                       title="Roll up all cards downstream of this card"
                                       onClick={(e) => {
                                          card.rollAll()
                                          cardStore.setSelected(null)
                                       }}
                                       className={`control-circle control-circle-large`}
                                    >
                                       <i className="fal fa-chevron-double-left"></i>
                                    </div>

                                    <div
                                       className={`control-circle control-circle-large pr-[2px]`}
                                       title="Roll up the outermost edge of the tree one layer"
                                       onClick={(e) => {
                                          card.roll()
                                          cardStore.setSelected(null)
                                          card.updateRollOutlines(true)
                                       }}
                                       onMouseOver={() => card.updateRollOutlines(true)}
                                       onMouseLeave={() => card.updateRollOutlines(false)}
                                    >
                                       <i className="fal fa-chevron-left"></i>
                                    </div>
                                 </div>

                                 <ArcherElement
                                    id={getRelatedCardsCollapseCircleArcherId({ card, side: isTop ? Side.TOP : side })}
                                 >
                                    <div
                                       className={`control-circle control-circle-small collapsed-children-indicator-${side.toLowerCase()}`}
                                       title="Show / hide child cards"
                                       onClick={(e) => {
                                          if (e.ctrlKey || e.altKey) {
                                             const val = !card.local.relatedCollapsed
                                             allDescendentAndRoot(card, (c) => c.toggleRelatedCollapsed(val))
                                          } else {
                                             card.toggleRelatedCollapsed()
                                          }
                                          e.stopPropagation()
                                       }}
                                    >
                                       {card.local.relatedCollapsed ? <span>...</span> : null}
                                    </div>
                                 </ArcherElement>

                                 <div className="flex flex-col gap-[4px]">
                                    <div
                                       className={`control-circle control-circle-large pl-[2px]`}
                                       title="Unroll all cards downstream of this card"
                                       onClick={(e) => card.unrollAll()}
                                    >
                                       <i className="fal fa-chevron-double-right"></i>
                                    </div>

                                    <div
                                       title="Unroll one layer at the outermost edge of the tree"
                                       className={`control-circle control-circle-large pl-[1px]`}
                                       onClick={(e) => card.unroll()}
                                    >
                                       <i className="fal fa-chevron-right"></i>
                                    </div>
                                 </div>
                              </div>

                              <div
                                 onClick={(e) => {
                                    card.uncollapseAllDescendentText()
                                 }}
                                 title="Show the text for all cards downstream of this card"
                                 className={`control-circle control-circle-large mt-[-8px]`}
                              >
                                 <i className="fal fa-chevron-double-down"></i>
                              </div>
                           </div>
                        ) : null} */}
                     </div>

                     {/* text collapse control */}
                     {card.cardLocationType !== CardLocationType.PARAGRAPH ? (
                        <div className={"card-controls text-controls"}>
                           <div
                              onClick={(e) => {
                                 card.toggleTextCollapsed()
                              }}
                              className={`text-collapse-circle`}
                              title="Show / hide text"
                           >
                              {card.local.textCollapsed ? (
                                 <i className="fal fa-chevron-down"></i>
                              ) : (
                                 <i className="fal fa-chevron-up"></i>
                              )}
                           </div>

                           <div className={`flex gap-[15px] mt-[-4px] ${card.peers.length ? "" : "opacity-0"}`}>
                              <div
                                 onClick={(e) => {
                                    card.uncollapsePeerText()
                                 }}
                                 title="Show the text for all cards in this row"
                                 className={`control-circle control-circle-large`}
                              >
                                 <i className="fal fa-chevron-double-down"></i>
                              </div>

                              <div
                                 onClick={(e) => {
                                    card.collapsePeerText()
                                 }}
                                 title="Hide the text for all cards in this row"
                                 className={`control-circle control-circle-large`}
                              >
                                 <i className="fal fa-chevron-double-up"></i>
                              </div>
                           </div>
                        </div>
                     ) : null}

                     {card.cardLocationType === CardLocationType.PARAGRAPH ? (
                        <div className="card-bottom-bar">
                           <QuickTagBar card={card}></QuickTagBar>
                        </div>
                     ) : (
                        <div className="card-above-top-bar">
                           <QuickTagBar card={card}></QuickTagBar>
                        </div>
                     )}
                  </div>
               </div>
            </ArcherElement>
         </div>

         {inHotseat ? <Gutter card={card} side={Side.RIGHT}></Gutter> : null}
      </div>
   )
}

function addEmbed(href: string) {
   const hasEmbed = /^https?:\/\/manifold\.markets\/embed\/.+$/.test(href)
   if (hasEmbed) return href

   const [, userAndSlug] = href.match(/^https?:\/\/manifold\.markets\/(\w+\/[\w-]+)/) || []
   return `https://manifold.markets/embed/${userAndSlug}`
}

const ObservedCardComponent = observer(CardComponent)

function CardWrapper({
   card,
   isTop,
   isAnchor,
   overhead,
   gutterItem,
   gutterSide,
   inHotseat,
   gutterOwner,
   reactTextWrapperRef,
   side,
}: CardProps) {
   const initialConfig = {
      editorState: card.text,
      namespace: "Card",
      editable: card.isMine && !gutterItem,
      nodes: getNodeList("Card"),
      onError: (error: Error) => {
         throw error
      },
      theme: { ...PlaygroundEditorTheme, card, id: uuidv4() },
   }

   return (
      <LexicalComposer initialConfig={initialConfig}>
         <ObservedCardComponent
            card={card}
            reactTextWrapperRef={reactTextWrapperRef}
            side={side}
            isTop={isTop}
            isAnchor={isAnchor}
            gutterOwner={gutterOwner}
            overhead={overhead}
            gutterItem={gutterItem}
            gutterSide={gutterSide}
            inHotseat={inHotseat}
         ></ObservedCardComponent>
      </LexicalComposer>
   )
}

export const Card = observer(CardWrapper)
