import uFuzzy from "@leeoniya/ufuzzy"
import { boardStore } from "./board.data"
import { CardRecord } from "./card.data"
import { ReactNode } from "react"

const searcher = new uFuzzy({
   intraChars: "[a-z ]",
   interChars: "[a-z ]",
   intraIns: 0,
   // interIns: 10,
})

const mark = (part: string, matched: boolean) => ({ part, matched })
const append = (accum: any[], part: any) => {
   accum.push(part)
}

export function searchCards(needle: string) {
   const board = boardStore.getCurrentBoard()

   const cardMap = new Map()

   const haystack: string[] = []

   for (const card of board.cards) {
      if (card.title) {
         haystack.push(card.title)
         cardMap.set(haystack.length - 1, { card, match: "titleMatch" })
      }
   }
   for (const card of board.cards) {
      if (card.plainText) {
         haystack.push(card.plainText)
         cardMap.set(haystack.length - 1, { card, match: "textMatch" })
      }
   }

   const [matches, info, ordering] = searcher.search(haystack, needle)

   if (!matches || !ordering || !info) return []

   const results: { card: CardRecord; titleMatch?: string | ReactNode[]; textMatch?: string | ReactNode[] }[] = []

   ordering.forEach((i) => {
      const uFuzzId = ordering[i]
      const haystackIndex = matches[uFuzzId]

      const { card, match } = cardMap.get(haystackIndex)

      let result = results.find((result) => result.card === card)
      if (!result) {
         result = { card }
         results.push(result)
      }

      const chunks: { part: string; matched: boolean }[] = []

      uFuzzy.highlight(
         haystack[haystackIndex],
         info.ranges[uFuzzId],
         mark,
         chunks,
         // @ts-ignore
         append
      )

      // trim text to either side
      if (match === "textMatch") {
         const trimLen = 50
         chunks.forEach((chunk, i) => {
            const prev = chunks[i - 1]
            const next = chunks[i + 1]

            if (chunk.matched) {
               if (prev && !prev.matched) {
                  chunks[i - 1].part = prev.part.substring(prev.part.length - trimLen, prev.part.length)
               }
               if (next && !next.matched) {
                  chunks[i + 1].part = next.part.substring(0, trimLen)
               }
            }
         })
      }

      result[match as "titleMatch" | "textMatch"] = chunks.map((chunk, i) =>
         chunk.matched ? (
            <span key={i} className={"word-highlighted"}>
               {chunk.part}
            </span>
         ) : (
            chunk.part
         )
      )
   })

   return results
}
