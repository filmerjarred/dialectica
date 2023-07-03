import { useEffect, useRef, useState } from "react"
import { CardRecord, cardStore } from "../lib/card.data"
import _ from "lodash"
import "react-quill/dist/quill.snow.css"
import "react-quill/dist/quill.bubble.css"
import { observer } from "mobx-react"
import { boardStore } from "../lib/board.data"
import { uiStore } from "../lib/ui.data"
import { searchCards } from "../lib/searchCards"
import { useDrag, useDragDropManager } from "react-dnd"
import { DragAndDropTypes } from "./Board"
import { mergeRefs } from "react-merge-refs"

function FinderComponent() {
   const [searchString, setSearchString] = useState("")
   const [highlightedLine, setHighlightedLine] = useState(0)
   const [mouseMoved, setMouseMoved] = useState(false)
   const [dragging, setDragging] = useState(false)

   const finderRef = useRef<HTMLDivElement>(null)
   const inputRef = useRef<HTMLInputElement>(null)

   const board = boardStore.getCurrentBoard()

   const items = searchCards(searchString)

   function onRef(node: HTMLInputElement) {
      if (node && document.activeElement !== node) {
         node.focus()
      }
   }

   const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchString(e.target.value)
   }

   function onSelect(card: CardRecord) {
      card.centerOnScreen()
      uiStore.toggleShowFinder(false)
   }

   function onBlur(e: React.FocusEvent) {
      if (!dragging) {
         uiStore.toggleShowFinder(false)
      }
   }

   function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      // handle highlight up and down
      if (e.key === "ArrowUp") {
         if (highlightedLine > 0) {
            setHighlightedLine(highlightedLine - 1)
         } else {
            setHighlightedLine(items.length - 1)
         }
      } else if (e.key === "ArrowDown") {
         if (highlightedLine < items.length - 1) {
            setHighlightedLine(highlightedLine + 1)
         } else {
            setHighlightedLine(0)
         }
      }

      // handle selection
      else if (e.key === "Tab" || e.key === "Enter") {
         if (items[highlightedLine]) {
            onSelect(items[highlightedLine].card)
         }
      }

      // handle escape
      else if (e.key === "Escape") {
         uiStore.toggleShowFinder(false)
         e.preventDefault()
         e.stopPropagation()
      }
   }

   return (
      <div
         ref={finderRef}
         className={`finder`}
         onKeyDown={onKeyDown}
         onBlur={onBlur}
         onWheelCapture={(e) => e.stopPropagation()}
      >
         <input
            ref={mergeRefs([inputRef, onRef])}
            className="p-1"
            onChange={onInputChange}
            placeholder={cardStore.isHotseat ? "click and drag items into the sidebars" : "search..."}
         />
         <div
            className="bg-white z-[999] scrollable max-h-[1000px]"
            onMouseDown={(e) => setDragging(true)}
            onMouseUp={(e) => {
               setDragging(false)
               inputRef.current?.focus()
            }}
         >
            {items.map(({ card, titleMatch, textMatch }, index) => {
               const isHighlighted = index === highlightedLine

               return (
                  <FinderItem
                     key={card.id}
                     setMouseMoved={setMouseMoved}
                     setDragging={setDragging}
                     onSelect={onSelect}
                     card={card}
                     isHighlighted={isHighlighted}
                     onMouseOver={() => (mouseMoved ? setHighlightedLine(index) : null)}
                     titleMatch={titleMatch}
                     textMatch={textMatch}
                  ></FinderItem>
               )
            })}
         </div>
      </div>
   )
}

function FinderItem({
   setMouseMoved,
   onSelect,
   card,
   isHighlighted,
   onMouseOver,
   titleMatch,
   textMatch,
   setDragging,
}: any) {
   const className = `flex cursor-pointer ellipsis p-1 border-t border-t-black  ${
      isHighlighted ? "line-highlighted" : ""
   }`

   const dragRef = useDrag(
      () => ({
         type: DragAndDropTypes.FINDER_ITEM,
         item: card,
         end() {
            setDragging(false)
         },
      }),
      [card]
   )[1]

   return (
      <div
         ref={dragRef}
         onMouseOver={onMouseOver}
         onMouseMove={() => setMouseMoved(true)}
         onClick={(e) => onSelect(card)}
         className={className}
         key={card.id}
      >
         <img className="card-user card-user-owner m-[6px]" src={card.leftUser.pic}></img>

         <div>
            {titleMatch || textMatch ? <div>{titleMatch || card.title}</div> : null}

            {textMatch ? <div className="text-xs">{textMatch}</div> : null}
         </div>
      </div>
   )
}

export const Finder = observer(FinderComponent)
