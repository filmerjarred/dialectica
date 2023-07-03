import _ from "lodash"
import { observer } from "mobx-react"
import { Menu, Item, Separator, Submenu, useContextMenu, RightSlot } from "react-contexify"
import { cardCommandMap } from "../lib/cardCommands"
import { CardRecord, cardStore, toUpperFirst } from "../lib/card.data"
import { uiStore } from "../lib/ui.data"
import { KeyMapKey, commandName } from "../lib/hotkeys"
import { errorAlert } from "../lib/makeStore"
import { tagStore } from "../lib/tag.data"

export const CARD_CONTEXT_MENU_ID = "OWNER_CARD_CONTEXT_MENU_ID"
export const PARTNER_CARD_CONTEXT_MENU_ID = "PARTNER_CARD_CONTEXT_MENU_ID"

export enum OP {
   DELETE,
   NEW_PEER,
   NEW_RELATED,

   COLLAPSE_RELATED,
   COLLAPSE_TEXT,

   TAG,
}

export function useCardContextMenu() {
   const { show } = useContextMenu({
      id: CARD_CONTEXT_MENU_ID,
   })

   // Gets called on right-click
   return async function handleContextMenu(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
      event.preventDefault()
      event.stopPropagation()
      show({ event })
   }
}

function Command({ id, emphasise, card }: { card: CardRecord; emphasise?: boolean; id: KeyMapKey }) {
   function onClick() {
      try {
         cardCommandMap[id].fn(card)
      } catch (e) {
         errorAlert(e)
         console.error(e)
      }
   }

   return (
      <Item onClick={onClick}>
         <span className={`${emphasise ? "font-bold text-blue-600" : ""}`}>{commandName(id)}</span>

         <span hidden={!cardCommandMap[id].description} className="ml-1 text-sm text-gray-600">
            - {cardCommandMap[id].description}
         </span>

         <RightSlot>{cardCommandMap[id].shortcut}</RightSlot>
      </Item>
   )
}

export const CardContextMenu = observer(function CardContextMenu() {
   const card = uiStore.contextMenuCard
   if (!card) {
      return (
         <Menu id={CARD_CONTEXT_MENU_ID}>
            <Separator />
         </Menu>
      )
   }

   const tagTypes = tagStore.tagTypes()
   const cardTagsIds = card.isMine ? card.ownerTagIds : card.partnerTagIds

   return (
      <Menu
         id={CARD_CONTEXT_MENU_ID}
         disableBoundariesCheck={false}
         onVisibilityChange={(visible) => {
            // if (!visible) debugger
         }}
      >
         {/* {card.isMine ? <Command id="CARD_HOTSEAT" card={card}></Command> : null} */}

         {/* <Command id="CARD_TODO" card={card}></Command> */}

         {cardStore.isHotseat ? <Command id="ADD_TO_GUTTER" card={card}></Command> : null}

         <Submenu label={"Tags"}>
            {tagTypes.map((tagType) => {
               return (
                  <Submenu key={tagType} label={toUpperFirst(tagType)}>
                     {_.flatMap(tagStore.tags(), (tagInfo) => {
                        if (tagInfo.tagType !== tagType) return []

                        if (tagInfo.deprecated && !cardTagsIds.includes(tagInfo.id)) return []

                        return [
                           <Item key={tagInfo.id} onClick={() => card.updateTags(tagInfo.id)}>
                              <span>
                                 <span
                                    className={`font-bold ${cardTagsIds.includes(tagInfo.id) ? "text-blue-600" : ""}`}
                                 >
                                    {toUpperFirst(tagInfo.name || tagInfo.id)}
                                 </span>{" "}
                                 - <span className="text-sm">{tagInfo.description}</span>
                              </span>
                           </Item>,
                        ]
                     })}
                  </Submenu>
               )
            })}
         </Submenu>

         <Separator />
         <Submenu label={"Type"}>
            <Command id="FREE_TEXT" card={card}></Command>
            <Command id="SQUIGGLE" card={card}></Command>
            <Command id="MANIFOLD" card={card}></Command>
         </Submenu>

         <Separator />

         {!card.isMine ? <Command emphasise={card.isAgreed} id="TOGGLE_AGREED" card={card}></Command> : null}
         {!card.isMine ? (
            <Command emphasise={card.isProvisionallyAgreed} id="TOGGLE_PROVISIONALLY_AGREED" card={card}></Command>
         ) : null}
         {card.isMine ? (
            <Command emphasise={card.isCentralPosition} id="TOGGLE_CENTRAL_POSITION" card={card}></Command>
         ) : null}

         <Separator />

         {!card.isMine ? <Command id="ADD_COMMENT" card={card}></Command> : null}

         <Command id="NEW_CARD_ABOVE" card={card}></Command>
         <Command id="NEW_CARD_BELOW" card={card}></Command>
         <Command id="NEW_RELATED_CARD" card={card}></Command>

         <Separator />

         <Command id="TOGGLE_HIDDEN" card={card}></Command>
         {card.isMine ? <Command id="TOGGLE_ARCHIVED" card={card}></Command> : null}

         <Separator />

         {card.isMine ? <Command id="DELETE" card={card}></Command> : null}
      </Menu>
   )
})
