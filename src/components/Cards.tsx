import _ from "lodash"
import { CardLocationType, CardRecord, cardStore, oppositeSide, Side } from "../lib/card.data"
import { Card } from "./Card"
import { observer } from "mobx-react"
import { useDragDropManager, useDrop } from "react-dnd"
import { DragAndDropTypes } from "./Board"
import { trace } from "mobx"
import { getUser } from "../lib/useUser"
import { useCardDrop } from "../lib/cardDrop"
import { ArcherElement } from "react-archer"
import { useMemo } from "react"
import { RelationType } from "react-archer/lib/types"
import uniqolor from "uniqolor"

function DropZone({ card }: { card: CardRecord }) {
   const dragDropManager = useDragDropManager()
   const isDragging = dragDropManager.getMonitor().isDragging()

   const [__, dropRef] = useCardDrop(card, (card) => ({ parentId: card.id, order: -1 }))

   const margin = card.side === Side.LEFT ? "mr-auto" : "ml-auto"
   const opacity = isDragging ? "opacity-[0.75]" : "opacity-0"

   return (
      <div
         className={`${margin} ${opacity} leading-[0px] max-w-[50px] min-w-[50px] max-h-[50px] h-[100%] flex justify-center items-center bg-amber-200`}
         ref={dropRef}
      >
         +
      </div>
   )
}

function CardsComponent({ cards, side, type }: { cards: CardRecord[]; side: Side; type: CardLocationType }) {
   const sortedCards = _(cards)
      .sortBy((c) => c.order)
      .value()

   const top = side === Side.TOP

   let className = "gap-5"
   if (!top) className += " flex-col"
   // if (type == CardBoardType.PARAGRAPH) className += " gap-4"
   // if (type !== CardBoardType.PARAGRAPH) className += " gap-4"

   return (
      <div className={`flex cards w-full ${className}`}>
         {sortedCards.map((card) => {
            if (!top && !card.show) return null

            return <CardWithChildren card={card} side={side} key={card.id} type={type}></CardWithChildren>
         })}
      </div>
   )
}

function CardWithChildrenComponent({ card, side, type }: { card: CardRecord; side: Side; type: CardLocationType }) {
   const left = side === Side.LEFT || side === Side.TOP
   const right = side === Side.RIGHT
   const top = side === Side.TOP

   const toShow = card.children.filter((c) => c.show)
   const isAnchor = card.isCentralPosition && !!toShow.length && !top

   const children = isAnchor ? toShow.filter((c) => card.ownerUserId === c.ownerUserId) : toShow
   const partnerCards = isAnchor
      ? card.children.filter((child) => child.show && child.ownerUserId !== card.ownerUserId)
      : []

   const arrowRelations: RelationType[] = useMemo(() => {
      if (top) {
         return [
            {
               targetId: `${card.boardId}-both`,
               targetAnchor: "bottom",
               sourceAnchor: "top",
            },
         ]
      } else if (isAnchor) {
         return [
            {
               targetId: card.parentId ? `${card.parentId}-${card.side}` : `${card.boardId}-${card.side}`,
               targetAnchor: card.side === Side.LEFT ? "right" : "left",
               sourceAnchor: card.side === Side.LEFT ? "left" : "right",
            },
         ]
         // } else if (card.parent?.hotseat) {
         //    return [
         //       {
         //          targetId: `${card.parent.id}-anchor`,
         //          targetAnchor: card.side === Side.LEFT ? "right" : "left",
         //          sourceAnchor: card.side === Side.LEFT ? "left" : "right",
         //       },
         //    ]
      } else return []
   }, [isAnchor])

   const childrenEle =
      !top && children.length ? (
         <Cards key={card.id + side + "children"} cards={children} side={side} type={type}></Cards>
      ) : null

   const partnerCardsEle =
      !top && partnerCards.length ? (
         <Cards
            key={card.id + side + "partnerChildren"}
            cards={partnerCards}
            side={oppositeSide(side)}
            type={type}
         ></Cards>
      ) : null

   let className = ""
   if (top) className += " flex flex-col"

   let colour = "transparent"
   if (isAnchor) {
      className += " card-anchor"

      colour = uniqolor(card.id, {
         saturation: [50, 100],
         lightness: 95,
      }).color
   }

   const cardEle = (
      <Card
         side={side}
         isTop={top}
         isAnchor={isAnchor}
         card={card}
         key={card.id + side}
         inHotseat={card.exploded && card.isMine}
      ></Card>
   )

   return (
      <ArcherElement
         id={`${card.id}-anchor${top ? "top" : ""}`}
         relations={arrowRelations}
         key={card.id + side + "cardAndRelated"}
      >
         {/* anchor boundary */}
         <div className={className} style={{ background: colour }}>
            {isAnchor ? (
               <div className="flex justify-center pb-[20px]">
                  <span
                     className={`pt-3 pb-4 px-4 text-lg  font-[500] ${card.isAgreed ? "agreed" : ""} ${
                        card.isProvisionallyAgreed ? "provisional-agreed" : ""
                     }`}
                  >
                     {card.title}
                  </span>
               </div>
            ) : null}

            {/* card and children */}
            <div className={`flex items-center side-${card.side.toLowerCase()}`}>
               {/* card */}
               {left ? <div className="flex flex-col relative">{cardEle}</div> : null}

               {/* children */}
               <div hidden={top} className="flex-1 related flex flex-col">
                  <div className="flex">
                     {left ? childrenEle : null}
                     {right ? partnerCardsEle : null}

                     {!childrenEle ? <DropZone card={card}></DropZone> : null}

                     {left ? partnerCardsEle : null}
                     {right ? childrenEle : null}
                  </div>
               </div>

               {/* card */}
               {right ? <div className="flex flex-col relative">{cardEle}</div> : null}
            </div>
         </div>
      </ArcherElement>
   )
}

export const Cards = observer(CardsComponent)
export const CardWithChildren = observer(CardWithChildrenComponent)
