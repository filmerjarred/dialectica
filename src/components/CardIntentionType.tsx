import { observer } from "mobx-react"
import { CardRecord } from "../lib/card.data"
import { useState } from "react"
import { CardIntentionRecord, cardIntentionStore } from "../lib/cardIntention.data"
import { tagStore } from "../lib/tag.data"

export const TagLine = observer(function TagLine({ card }: { card: CardRecord }) {
   const [showOptions, setShowOptions] = useState(false)

   function onSelect(cardIntentionTypeId: string) {
      card.update({ cardIntentionTypeId })
      setShowOptions(false)

      console.log(tagStore.tagsByIntention(cardIntentionTypeId))
   }

   return (
      <span
         tabIndex={0}
         className="relative ml-1 h-[12px] block cursor-pointer "
         onClick={() => setShowOptions(true)}
         onBlur={() => setShowOptions(false)}
      >
         <div>
            {!card.cardIntentionTypeId || card.cardIntentionTypeId === "BLANK" ? (
               <span className="hover:bg-[#00a7dfe3] block w-[200px] h-[12px]"></span>
            ) : (
               <span>{cardIntentionStore.cardIntentionType(card.cardIntentionTypeId).name}</span>
            )}
         </div>

         {!showOptions ? null : (
            <span className="absolute left-[-64px] top-[15px] block z-[99]">
               <span className="flex flex-col border border-black block bg-white z-[999] cursor-pointer border-b-0">
                  {cardIntentionStore.cardIntentionTypesByLocation(card.cardLocationType).map((tagLineInfo, index) => (
                     <span
                        key={index}
                        onMouseDown={() => onSelect(tagLineInfo.id)}
                        className={`whitespace-nowrap hover:bg-[#00a7dfe3] border-b border-black px-[6px] py-[3px]`}
                     >
                        <span className="inline-block font-bold min-w-[60px]">{tagLineInfo.name}: </span>
                        <span>{tagLineInfo.text}</span>
                        <span className="text-slate-600"> ({tagLineInfo.description})</span>
                     </span>
                  ))}
               </span>
            </span>
         )}
      </span>
   )
})
