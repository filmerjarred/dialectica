import _ from "lodash"
import { CardRecord } from "../lib/card.data"
import { tagStore } from "../lib/tag.data"
import { toUpperFirst } from "../lib/todo.data"
import { uiStore } from "../lib/ui.data"
import { useTagContextMenu } from "./TagContextMenu"

export function Tags({ card, tags: tagIds, tagsAreMine }: { card: CardRecord; tags: any[]; tagsAreMine: boolean }) {
   const openMenu = useTagContextMenu()
   const onClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!tagsAreMine) return

      uiStore.setContextMenuCard(card)
      openMenu(event)
   }

   const className = `tags flex whitespace-pre items-center ${tagsAreMine ? "cursor-pointer" : ""}`

   const sortedTagIds = _.sortBy(tagIds, (tagId) => tagStore.tagTypes().indexOf(tagStore.tag(tagId).tagType))

   const okay = sortedTagIds.length === 1 && sortedTagIds[0] === "OKAY"

   return (
      <span className={className} onClick={onClick}>
         {sortedTagIds.length ? (
            // tags
            <span>
               <span key={"a"}>{!okay ? "Feels" : ""} </span>
               {sortedTagIds.map((tagId, index) => {
                  const tagInfo = tagStore.tag(tagId)

                  return (
                     <span key={index}>
                        <span className="tooltip">
                           <span className="tooltiptext">{tagInfo.description}</span>
                           {tagInfo.name || toUpperFirst(tagId)}
                        </span>
                        {index < tagIds.length - 1 ? " & " : ""}
                     </span>
                  )
               })}
            </span>
         ) : // no tags
            <span className="opacity-0 hover:opacity-100 text-slate-600">Seems...</span>}
      </span>
   )
}
