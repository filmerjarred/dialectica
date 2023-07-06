import autoBind from "auto-bind"
import { observable } from "mobx"
import { Record, Store } from "./makeStore"
import { tagInfo } from "./tagInfo"
import { CardLocationType } from "./card.data"
import { isDev } from "./isDev"

export class CardIntentionRecord {
   // export class CardIntentionRecord extends Record<CardIntentionRecord> {
   id!: string
   name!: string
   text!: string
   description!: string

   // Location based limit on types of card can have this intention
   cardLocationTypes!: CardLocationType[] | null

   static defaults = {
      cardLocationTypes: [],
   }
}

class CardIntentionStore {
   // class CardIntentionStore extends Store<typeof CardIntentionRecord, CardIntentionRecord> {
   cardIntentionType(cardIntentionTypeId: string | null): CardIntentionRecord {
      const info = this.cardIntentionTypes().find((t) => t.id === cardIntentionTypeId)
      if (!info) {
         return this.cardIntentionType("BLANK")
      }

      return info
   }

   cardIntentionTypeIds() {
      return ["CLAIM", "PARAPHRASE", "OFFERING", "SEEMING", "QUESTION", "BLANK"]
   }

   cardIntentionTypesByLocation(cardLocationTypeId: CardLocationType): CardIntentionRecord[] {
      return this.cardIntentionTypes().filter(
         (intentionType) =>
            !intentionType.cardLocationTypes || intentionType.cardLocationTypes.includes(cardLocationTypeId)
      )
   }

   cardIntentionTypes(): CardIntentionRecord[] {
      return [
         { id: "BLANK", name: "Blank", text: "", description: "*intentions unknown*", cardLocationTypes: null },
         {
            id: "CLAIM",
            name: "Claim",
            text: "Here's something I think",
            description: "Make a some claim about what you think is true or good",
            cardLocationTypes: [CardLocationType.POSITION],
         },

         // {
         //    id: "TRUTH CLAIM",
         //    name: "Truth Claim",
         //    text: "Here's something I think is true",
         //    description: "Make a some claim that the world is a certain way",
         //    cardLocationTypes: [CardLocationType.POSITION],
         // },
         // {
         //    id: "MORAL CLAIM",
         //    name: "Moral Claim",
         //    text: "Here's what I think should be",
         //    description: "Make a some claim that the world is a certain way",
         //    cardLocationTypes: [CardLocationType.POSITION],
         // },
         // {
         //    id: "EXECUTIVE CLAIM",
         //    name: "Executive Claim",
         //    text: "Here's what I think we should do",
         //    description: "Make a some claim as to what should be done",
         //    cardLocationTypes: [CardLocationType.POSITION],
         // },

         {
            id: "PARAPHRASE",
            name: "Paraphrase",
            text: "Is this what you're saying?",
            description: "Confirm understanding of something they wrote by paraphrasing in your own words",
            cardLocationTypes: null,
         },
         {
            id: "OFFERING",
            name: "Offering",
            text: "Would you say this?",
            description: "Confirm your understanding something you think your partner believes but hasn't written",
            cardLocationTypes: null,
         },
         {
            id: "SEEMING",
            name: "Seeming",
            text: "Do you say this because...",
            description: "Check your understanding of why your partner has said / would say something",
            cardLocationTypes: null,
         },
         {
            id: "QUESTION",
            name: "Question",
            text: "",
            description: "",
            cardLocationTypes: null,
         },
         {
            id: "ANSWER",
            name: "Answer",
            text: "",
            description: "",
            cardLocationTypes: null,
         },
      ]
   }
}

export const cardIntentionStore = new CardIntentionStore()
// export const tagStore = new CardIntentionStore(CardIntentionRecord, "CardIntentionData").init()
