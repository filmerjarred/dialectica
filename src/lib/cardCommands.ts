import { CardRecord, CardMediumType, Side, cardStore, toUpperFirst } from "./card.data"
import { $insertDialecticaParagraphNode } from "./editor/plugins/DialecticaParagraphPlugin"
import { uiStore } from "./ui.data"

interface CardCommand {
   shortcut?: string | string[]
   fn: (card: CardRecord) => any
   name?: string
   description?: string
}

export const cardCommandMap: { [i: string]: CardCommand } = {
   CARD_HOTSEAT: {
      shortcut: "alt+z",
      fn: (card) => {
         if (!card.isMine) return

         // if (!card.isHotseat) {
         // card.hotseat()
         // } else {
         card.update({ exploded: !card.exploded })
         // cardStore.setHotseat(null)
         // card.update({ ultraZen: !card.ultraZen })
         // }
      },
   },

   FREE_TEXT: {
      fn: (card) => {
         card.update({ cardMediumType: CardMediumType.FREE_TEXT })
      },
   },

   MANIFOLD: {
      fn: (card) => {
         card.update({ cardMediumType: CardMediumType.MANIFOLD })
      },
   },

   SQUIGGLE: {
      fn: (card) => {
         card.update({ cardMediumType: CardMediumType.SQUIGGLE })
      },
   },

   ADD_TO_GUTTER: {
      fn: (card) => {
         if (cardStore.currentHotseat) {
            cardStore.currentHotseat.addToGutter(Side.RIGHT, card)
         }
      },
   },

   CARD_TODO: {
      name: "Add to Inbox",
      shortcut: "alt+e",
      fn: (card) => {
         card.todo()
      },
   },

   TOGGLE_HIDDEN: {
      description: "Hide card just for you",
      fn: (card) => {
         card.toggleHide()
      },
   },
   TOGGLE_ARCHIVED: {
      description: "Remove from board",
      fn: (card) => {
         card.toggleArchived()
      },
   },
   DELETE: {
      shortcut: "alt+Backspace",
      fn: (card) => card.remove(),
   },

   SEEMS_RIGHT: {
      shortcut: "alt+1",
      description: "This is in harmony with my sense of what is true, good, and relevant",
      fn: (card) => card.updateTags("RIGHT"),
   },
   FEELS_DISSONANT: {
      shortcut: "alt+2",
      description: "This generates errors in my brain",
      fn: (card) => card.updateTags("DISSONANT"),
   },

   TOGGLE_AGREED: {
      shortcut: "alt+a",
      description: "Indicate you agree",
      fn: (card) => card.toggleIsAgreed(),
   },

   TOGGLE_PROVISIONALLY_AGREED: {
      shortcut: "alt+shift+a",
      description: "Indicate you may agree, *assuming* you agreed with other claims",
      fn: (card) => card.toggleIsProvisionallyAgreed(),
   },

   TOGGLE_CENTRAL_POSITION: {
      shortcut: "alt+s",
      name: "Make Sub-board",
      fn: (card) => card.toggleIsCentralPosition(),
   },

   NEW_CARD_BELOW: {
      shortcut: ["ctrl+alt+ArrowDown", "alt+shift+ArrowDown"],
      name: "Add Card Below",
      fn: (card) =>
         card
            .newPeer({ order: card.order + 0.1 })
            .focusCursor()
            .centerOnScreen(),
   },

   NEW_CARD_ABOVE: {
      shortcut: ["ctrl+alt+ArrowUp", "alt+shift+ArrowUp"],
      name: "Add Card Above",
      fn: (card) =>
         card
            .newPeer({ order: card.order - 0.1 })
            .focusCursor()
            .centerOnScreen(),
   },

   NEW_RELATED_CARD: {
      shortcut: ["alt+Enter", "ctrl+alt+ArrowRight", "alt+shift+ArrowRight"],
      name: "Add Response",
      fn: (card) => card.newRelated().focusCursor(),
   },
   FOCUS_TITLE: {
      shortcut: "alt+t",
      fn: (card) => {
         if (!card) return
         card.handleInputClick("title", card.title.length)
      },
   },

   MOVE_FOCUS_UP: {
      shortcut: "alt+ArrowUp",
      fn: (card) => card.focusUp(),
   },
   MOVE_FOCUS_DOWN: {
      shortcut: "alt+ArrowDown",
      fn: (card) => card.focusDown(),
   },
   MOVE_FOCUS_LEFT: {
      shortcut: "alt+ArrowLeft",
      fn: (card) => card.focusLeft(),
   },
   MOVE_FOCUS_RIGHT: {
      shortcut: "alt+ArrowRight",
      fn: (card) => card.focusRight(),
   },

   ADD_COMMENT: {
      shortcut: "alt+r",
      fn: (card) => {
         $insertDialecticaParagraphNode(card)
      },
   },

   COLLAPSE_TEXT: {
      shortcut: "alt+",
      fn: (card) => card.toggleTextCollapsed(),
   },

   COLLAPSE_RELATED: {
      shortcut: "alt+w",
      fn: (card) => card.toggleRelatedCollapsed(),
   },
}
