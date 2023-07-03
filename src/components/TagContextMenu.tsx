import _ from "lodash"
import { observer } from "mobx-react"
import { Menu, Item, Separator, useContextMenu } from "react-contexify"
import { toUpperFirst } from "../lib/card.data"
import { uiStore } from "../lib/ui.data"
import { tagStore } from "../lib/tag.data"

export const TAG_CONTEXT_MENU_ID = "OWNER_TAG_CONTEXT_MENU_ID"
export const PARTNER_TAG_CONTEXT_MENU_ID = "PARTNER_TAG_CONTEXT_MENU_ID"

export function useTagContextMenu() {
   const { show } = useContextMenu({
      id: TAG_CONTEXT_MENU_ID,
   })

   // Gets called on right-click
   return async function handleContextMenu(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
      event.preventDefault()
      event.stopPropagation()
      show({ event })
   }
}

export const TagContextMenu = observer(() => {
   const card = uiStore.contextMenuCard
   if (!card) {
      return (
         <Menu id={TAG_CONTEXT_MENU_ID}>
            <Separator />
         </Menu>
      )
   }

   const tagTypes = tagStore.tagTypes()
   const cardTagsIds = card.isMine ? card.ownerTagIds : card.partnerTagIds

   return (
      <Menu
         id={TAG_CONTEXT_MENU_ID}
         disableBoundariesCheck={false}
         onVisibilityChange={(visible) => {
            // if (!visible) debugger
         }}
      >
         {tagTypes
            .map((tagType, index) => {
               const tags = _.flatMap(tagStore.tagsByIntention(card.cardIntentionTypeId), (tagInfo) => {
                  if (tagInfo.tagType !== tagType) return []
                  if (tagInfo.deprecated && !cardTagsIds.includes(tagInfo.id)) return []
                  return [tagInfo]
               })

               if (!tags.length) return []

               return [
                  <div className="m-1 inline-block border-b border-b-black" key={index}>
                     {toUpperFirst(tagType.replaceAll("-", " "))} Tags
                  </div>,

                  ..._.map(tags, (tagInfo) => {
                     return [
                        <Item
                           closeOnClick={tagInfo.tagType === "AGGREGATE"}
                           key={tagInfo.id}
                           onClick={() => {
                              card.updateTags(tagInfo.id)
                              // @ts-ignore stops focus locking onto menu item on click
                              document.activeElement.blur()
                           }}
                        >
                           <span>
                              <span className={`font-bold ${cardTagsIds.includes(tagInfo.id) ? "text-blue-600" : ""}`}>
                                 {toUpperFirst(tagInfo.name || tagInfo.id)}
                              </span>{" "}
                              - <span className="text-sm">{tagInfo.description}</span>
                           </span>
                        </Item>,
                     ]
                  }),
               ]
            })
            .filter((x) => !!x.length)
            .flatMap((section, index, sections) => [
               ...section,
               index < sections.length - 1 ? <Separator key={index + "sep"} /> : null,
            ])}
      </Menu>
   )
})
