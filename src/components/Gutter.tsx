import { observer } from "mobx-react"
import { boardStore } from "../lib/board.data"
import { CardRecord, GutterItem, Side, allAncestors, cardStore } from "../lib/card.data"
import _ from "lodash"
import { userStore } from "../lib/user.data"
import { useCallback, useState } from "react"
import { TodoRecord, todoStore } from "../lib/todo.data"
import { Todos } from "./Todo"
import { uiStore } from "../lib/ui.data"
import { useDrop } from "react-dnd"
import { DragAndDropTypes } from "./Board"
import { Card } from "./Card"
import { runInAction, trace } from "mobx"

export const Gutter = observer(function Gutter({ side, card }: { side: Side; card: CardRecord }) {
   const [showGutter, setShowGutter] = useState(true)

   const dropRef = useDrop(
      () => ({
         accept: [DragAndDropTypes.CARD, DragAndDropTypes.FINDER_ITEM, DragAndDropTypes.WIKILINK],
         drop: (draggedCard: CardRecord) => {
            card.addToGutter(side, draggedCard)
         },
         collect: (monitor) => ({
            canDrop: !!monitor.canDrop(),
         }),
      }),
      [card]
   )[1]

   let items: GutterItem[]
   let ancestors: GutterItem[] = []
   let children: GutterItem[] = []

   if (side === Side.LEFT) {
      ancestors = allAncestors(card as any as CardRecord, (x) => x)
         .reverse()
         .map((c, order) => ({
            cardId: c.id,
            order,
         }))
      children = card.children.map((c, order) => ({
         cardId: c.id,
         order,
      }))
      items = [...ancestors, ...children]
   } else {
      items = card.getGutterItems(side)
   }

   let elements
   if (side === Side.RIGHT) {
      if (!items.length)
         elements = (
            <span className="italics text-slate-600 m-auto">
               Add cards by clicking and dragging from the finder or the board
            </span>
         )
      else
         elements = items.map((item) => {
            const gutterCard = cardStore.records.get(item.cardId)!
            if (!gutterCard) card.removeFromGutter(side, item)
            else {
               return (
                  <Card
                     key={gutterCard.id}
                     card={gutterCard}
                     gutterItem={item}
                     gutterSide={side}
                     gutterOwner={card}
                     side={card.side}
                  ></Card>
               )
            }
         })
   } else {
      elements = [
         <span className="mr-auto ml-2 mb-1" key="parent">
            🔼 Parents
         </span>,

         ...ancestors.map((item) => {
            const gutterCard = cardStore.records.get(item.cardId)!
            if (!gutterCard) card.removeFromGutter(side, item)
            else {
               return (
                  <Card
                     key={gutterCard.id + "gutter"}
                     card={gutterCard}
                     gutterItem={item}
                     gutterSide={side}
                     gutterOwner={card}
                     side={card.side}
                  ></Card>
               )
            }
         }),

         <span className="mt-5 mr-auto ml-2 mb-1" key="children">
            🔽Children
         </span>,

         ...children.map((item) => {
            const gutterCard = cardStore.records.get(item.cardId)!
            if (!gutterCard) card.removeFromGutter(side, item)
            else {
               return (
                  <Card
                     key={gutterCard.id + "gutter"}
                     card={gutterCard}
                     gutterItem={item}
                     gutterSide={side}
                     side={card.side}
                  ></Card>
               )
            }
         }),
      ]
   }

   return (
      <div className={`card-gutter gutter-${side.toLowerCase()} scrollable text-sm`} ref={dropRef}>
         <span className="w-full flex">
            {side === Side.RIGHT && showGutter && !card.ultraZen ? (
               <i
                  title="Collapse all items"
                  onClick={() => {
                     runInAction(() => {
                        items.forEach((item) => {
                           item.textCollapsed = true
                        })
                     })
                  }}
                  className={`${side === Side.RIGHT ? "mr-auto" : ""} ml-2 my-3 cursor-pointer fal fa-minus-square`}
               ></i>
            ) : null}

            <span className={`ml-auto mr-2 my-3 cursor-pointer `}>
               <i
                  title="Close gutter"
                  onClick={() => setShowGutter(!showGutter)}
                  className={`ml-2 fal ${
                     showGutter
                        ? "fa-times-square"
                        : side === Side.LEFT
                        ? "fa-chevron-square-right"
                        : "fa-chevron-square-left"
                  }`}
               ></i>
            </span>
         </span>

         {showGutter && !card.ultraZen ? elements : null}
      </div>
   )
})
