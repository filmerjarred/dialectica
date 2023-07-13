import _ from "lodash"
import { CardLocationType, CardRecord, cardStore, oppositeSide, Side } from "../lib/card.data"
import { Card } from "./Card"
import { observer } from "mobx-react"
import { useDragDropManager, useDrop } from "react-dnd"
import { DragAndDropTypes } from "./Board"
import { reaction, trace } from "mobx"
import { getUser } from "../lib/useUser"
import { useCardDrop } from "../lib/cardDrop"
import { ArcherElement } from "react-archer"
import { useEffect, useMemo, useRef } from "react"
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

   let className = ""
   if (!top) className += " flex-col"
   if (type == CardLocationType.PARAGRAPH) className += " gap-5"
   if (type !== CardLocationType.PARAGRAPH) className += " gap-20"

   return (
      <div className={`cards ${className}`}>
         {sortedCards.map((card) => {
            if (!top && !card.show) return null

            return <CardWithChildren card={card} side={side} key={card.id} type={type}></CardWithChildren>
         })}
      </div>
   )
}

function CardWithChildrenComponent({ card, side, type }: { card: CardRecord; side: Side; type: CardLocationType }) {
   const cardColumnRef = useRef<HTMLDivElement>(null)
   const reactTextWrapperRef = useRef<HTMLDivElement>(null)

   const left = side === Side.LEFT || side === Side.TOP
   const right = side === Side.RIGHT
   const top = side === Side.TOP

   const toShow = card.shownChildren
   const isSubBoard = card.isCentralPosition && !!toShow.length && !top

   const children = isSubBoard ? toShow.filter((c) => card.ownerUserId === c.ownerUserId) : toShow
   const partnerCards = isSubBoard ? card.shownChildren.filter((child) => child.ownerUserId !== card.ownerUserId) : []

   const arrowRelations: RelationType[] = useMemo(() => {
      if (top) {
         return [
            {
               targetId: `${card.boardId}-both`,
               targetAnchor: "bottom",
               sourceAnchor: "top",
            },
         ]
      } else if (isSubBoard) {
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
   }, [isSubBoard])

   useEffect(() => {
      // const resizeObserver = new ResizeObserver((entries) => {
      //    if (entries.length > 0) {
      //       if (!cardColumnRef.current || !reactTextWrapperRef.current) return
      //       if (!card.local.textCollapsed) {
      //          reactTextWrapperRef.current.style.marginBottom = "0px"
      //          cardColumnRef.current.style.minHeight = "0px"
      //       } else {
      //          // reactTextWrapperRef.current.style.marginBottom = `-200%`
      //          cardColumnRef.current.style.marginBottom = `-${reactTextWrapperRef.current?.offsetHeight || 0}px`
      //       }
      //    }
      // })
      // resizeObserver.observe(reactTextWrapperRef.current!)
      // return () => resizeObserver.disconnect()
      // return reaction(
      //    () => card.local.textCollapsed,
      //    (textCollapsed) => {
      //       if (!cardColumnRef.current || !reactTextWrapperRef.current) return
      //       if (textCollapsed) {
      //          cardColumnRef.current.style.marginBottom = `-${reactTextWrapperRef.current?.offsetHeight || 0}px`
      //          // reactTextWrapperRef.current.style.marginBottom = `-200%`
      //       } else {
      //          reactTextWrapperRef.current.style.marginBottom = "0px"
      //          cardColumnRef.current.style.minHeight = "0px"
      //       }
      //    }
      // )
   }, [])

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
   if (isSubBoard) {
      className += " card-sub-board"

      colour = uniqolor(card.id, {
         saturation: [60, 100],
         lightness: 95,
      }).color
   }

   const cardEle = (
      <div ref={cardColumnRef} className="card-column">
         <Card
            side={side}
            reactTextWrapperRef={reactTextWrapperRef}
            isTop={top}
            isAnchor={isSubBoard}
            card={card}
            key={card.id + side}
            inHotseat={card.exploded && card.isMine}
         ></Card>
      </div>
   )

   return (
      <ArcherElement
         id={`${card.id}-anchor${top ? "top" : ""}`}
         relations={arrowRelations}
         key={card.id + side + "cardAndRelated"}
      >
         {/* card-sub-board boundary */}
         <div className={className} style={{ background: colour }}>
            {/* <div className={className} style={{ background: colour }}> */}
            {isSubBoard ? (
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
            <div className={`card-with-child-cards side-${side.toLowerCase()}`}>
               {/* card */}
               {left ? cardEle : null}

               {/* children */}
               <div hidden={top} className="child-cards related">
                  <div className="flex items-center">
                     {left ? childrenEle : null}
                     {right ? partnerCardsEle : null}

                     {!childrenEle ? <DropZone card={card}></DropZone> : null}

                     {left ? partnerCardsEle : null}
                     {right ? childrenEle : null}
                  </div>
               </div>

               {/* card */}
               {right ? cardEle : null}
            </div>
         </div>
      </ArcherElement>
   )
}

export const Cards = observer(CardsComponent)
export const CardWithChildren = observer(CardWithChildrenComponent)
