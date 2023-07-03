import { observer } from "mobx-react"
import { CardLocationType, CardRecord } from "../lib/card.data"
import { tagStore } from "../lib/tag.data"

export const QuickTagBar = observer(function QuickTagBar({ card }: { card: CardRecord }) {
   const myTagIds = card.isMine ? card.ownerTagIds : card.partnerTagIds
   if (myTagIds.length) return null

   if (card.isMine) return null

   function onClick(tagId: string) {
      card.updateTags(tagId)
   }

   const rightTag = tagStore.tag("RIGHT")
   const dissonantTag = tagStore.tag("DISSONANT")

   return (
      <div className="answers">
         <span className="tooltip" onClick={() => onClick(rightTag.id)}>
            <span className="tooltiptext">{rightTag.description}</span>
            <span className="answer bg-white text-sky-500 hover:text-[white] hover:bg-sky-500">Seems Right</span>
         </span>

         <span className="tooltip text-orange-500" onClick={() => onClick(dissonantTag.id)}>
            <span className="tooltiptext">{dissonantTag.description}</span>
            <span className="answer bg-white text-orange-500 hover:text-[white] hover:bg-orange-500">
               Feels Dissonant
            </span>
         </span>
      </div>
   )
})
