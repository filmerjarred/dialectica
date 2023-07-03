import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { LexicalNode } from "lexical"
import _ from "lodash"
import { observable, runInAction } from "mobx"
import { observer } from "mobx-react"
import { useContext, useEffect, useLayoutEffect, useRef } from "react"
import { ArcherElement } from "react-archer"
import { CardLocationType, CardRecord, LexicalParagraphData, Side } from "../lib/card.data"
import { DialecticaParagraphNode } from "../lib/editor/plugins/DialecticaParagraphPlugin"
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
