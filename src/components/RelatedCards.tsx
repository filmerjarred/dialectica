import _ from "lodash"
import { runInAction } from "mobx"
import { observer } from "mobx-react"
import { useContext, useEffect, useRef } from "react"
import { ArcherElement } from "react-archer"
import { CardLocationType, CardRecord, LexicalParagraphData, Side } from "../lib/card.data"
import { getParagraphCardGutterCenterLeft } from "../lib/useArcherRelations"
import { Cards } from "./Cards"
import { ArcherRefreshContext } from "./Board"

function getDepth(cards: CardRecord[], i: number = 1): number {
   let max = 0

   for (const card of cards) {
      const depth = card.children.length ? getDepth(card.children, i + 1) : i
      if (depth > max) {
         max = depth
      }
   }

   return max
}

export const RelatedCards = observer(function RelatedCards({ card }: { card: CardRecord }) {
   if (!card.lexicalParagraphAndCards.length) return null

   const depth = getDepth(card.relatedParagraphCards)
   return (
      <div className="relative flex-1" style={{ minWidth: 635 * depth }}>
         {_.map(card.lexicalParagraphAndCards, (p) => (
            <RelatedParagraphCards
               key={card.id + p.paragraph.id}
               parentCardId={card.id}
               cards={p.cards}
               paragraph={p.paragraph}
            />
         ))}
      </div>
   )
})

const COMMENT_MARGIN = 16 // how much margin to ensure the comments have between one another vertically

export const RelatedParagraphCards = observer(function RelatedParagraphCards({
   cards,
   parentCardId,
   paragraph,
}: {
   cards: CardRecord[]
   parentCardId: string
   paragraph: LexicalParagraphData
}) {
   const ref = useRef<HTMLDivElement>(null)
   const archerContainer = useContext(ArcherRefreshContext)

   useEffect(() => {
      runInAction(() => {
         paragraph.relatedCardsHeight = 0
      })

      const resizeObserver = new ResizeObserver((entries) => {
         if (entries.length > 0) {
            runInAction(() => {
               paragraph.relatedCardsHeight = (ref.current?.offsetHeight || 0) + COMMENT_MARGIN
            })
         }
      })

      resizeObserver.observe(ref.current!)

      return () => resizeObserver.disconnect()
   }, [])

   useEffect(() => {
      if (archerContainer.current) {
         archerContainer.current.refreshScreen()
      }
   }, [paragraph.paragraphY])

   return (
      <div
         ref={ref}
         className="absolute flex items-center"
         style={{
            top: (paragraph.paragraphY || 0) + COMMENT_MARGIN / 2 + "px",
            minHeight: paragraph.paragraphHeight + "px",
         }}
      >
         <div className="centerize-vertical">
            <ArcherElement
               id={getParagraphCardGutterCenterLeft({ paragraphId: paragraph.id, paragraphParentCardId: parentCardId })}
            >
               <div></div>
            </ArcherElement>
         </div>

         <div>
            <Cards type={CardLocationType.PARAGRAPH} cards={cards} side={Side.LEFT}></Cards>
         </div>
      </div>
   )
})
