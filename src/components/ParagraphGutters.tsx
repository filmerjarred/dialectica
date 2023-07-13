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

export const ParagraphGutters = observer(function RelatedCards({ card }: { card: CardRecord }) {
   if (!card.lexicalParagraphsWithCards.length) return null

   const depth = getDepth(card.relatedParagraphCards)
   return (
      <div className="relative flex-1" style={{ minWidth: 675 * depth }}>
         {_.map(card.lexicalParagraphsWithCards, (p) => (
            <ParagraphGutter key={card.id + p.paragraph.id} parentCard={card} cards={p.cards} paragraph={p.paragraph} />
         ))}
      </div>
   )
})

const COMMENT_MARGIN = 16 // how much margin to ensure the comments have between one another vertically

export const ParagraphGutter = observer(function RelatedParagraphCards({
   cards,
   parentCard,
   paragraph,
}: {
   cards: CardRecord[]
   parentCard: CardRecord
   paragraph: LexicalParagraphData
}) {
   const ref = useRef<HTMLDivElement>(null)
   const archerContainer = useContext(ArcherRefreshContext)

   useEffect(() => {
      runInAction(() => {
         paragraph.relatedCardsHeight = -1
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
   }, [paragraph.editorId])

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
         {!parentCard.isMine ? (
            <div
               className={`paragraphs-to-lines do-not-blur-sentence ${
                  paragraph.splitSentences ? "text-sky-500" : "opacity-20"
               }`}
               tabIndex={0}
               onClick={() => {
                  runInAction(() => {
                     paragraph.splitSentences = !paragraph.splitSentences
                  })
               }}
            >
               <i className="fas fa-line-height"></i>
            </div>
         ) : null}

         <div className="centerize-vertical">
            <ArcherElement
               id={getParagraphCardGutterCenterLeft({
                  paragraphId: paragraph.id,
                  paragraphParentCardId: parentCard.id,
               })}
            >
               <div></div>
            </ArcherElement>
         </div>

         {/* related cards */}
         <div>
            <Cards type={CardLocationType.PARAGRAPH} cards={cards} side={Side.LEFT}></Cards>
         </div>
      </div>
   )
})
