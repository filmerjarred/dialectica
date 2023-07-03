import { observer } from "mobx-react"
import { memo, useRef, useState } from "react"
import { BoardRecord } from "../lib/board.data"
import { TimelineDataChunk } from "../lib/timeline.data"
import { getUser } from "../lib/useUser"
import moment from "moment"
import { userStore } from "../lib/user.data"
import { diffChars, diffWords } from "diff"
import { CardLocationType, cardStore } from "../lib/card.data"
import { toast } from "react-toastify"
import React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { lexicalToText } from "../lib/lexicalToText"
import { cardIntentionStore } from "../lib/cardIntention.data"

function formatTime(rawTime: number) {
   const time = moment(rawTime)

   return `(published ${time.fromNow()})`
}

const PAGE_SIZE = 15

function TimelineComponent({ board }: { board: BoardRecord }) {
   const [page, setPage] = useState(0)

   const parentRef = React.useRef<HTMLDivElement>(null)

   const unpublished = board.userCards.filter((c) => c.hasUnpublishedChanges)

   const publishEvents = board.timeline.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

   return (
      <div className="timeline text-sm" ref={parentRef}>
         {page === 0 && unpublished.length ? (
            <div className="publish-event">
               <div className="publish-event-header">
                  <img className="user-image-circle" src={board.owner.pic}></img>
                  <div className="italics">Unpublished</div>
               </div>

               <div>
                  {unpublished.map((card, i) => {
                     const chunk: TimelineDataChunk = {
                        cardId: card.id,
                        newText: card.updatedText ? lexicalToText(card.updatedText) : null,
                        oldText: card.oldText ? lexicalToText(card.oldText) : "",

                        newTitle:
                           card.cardLocationType === CardLocationType.PARAGRAPH
                              ? `${cardIntentionStore.cardIntentionType(card.cardIntentionTypeId).name} comment on \"${
                                   card.paragraphParent!.title.length ? card.paragraphParent!.title : "Untitled Card"
                                }\"`
                              : card.updatedTitle,
                        oldTitle: card.oldTitle,
                     }

                     return <TimelineChunk key={chunk.cardId} chunk={chunk}></TimelineChunk>
                  })}
               </div>
            </div>
         ) : null}

         {publishEvents.map((publish) => {
            const chunks = publish.getChunks()
            const user = userStore.records.get(publish.publishingUserId)
            if (!user) throw new Error("Could not find user for publish event")

            return (
               <div key={publish.id} className="publish-event">
                  <div className="publish-event-header">
                     <img className="user-image-circle" src={user.pic}></img>
                     <div>{formatTime(publish.time)}</div>
                  </div>

                  <div>
                     {chunks.map((chunk, i) => (
                        <TimelineChunk key={chunk.cardId} chunk={chunk}></TimelineChunk>
                     ))}
                  </div>
               </div>
            )
         })}

         <div className="flex p-2 px-[15px] items-center">
            <button className="mr-auto" onClick={() => setPage(page - 1)}>
               Prev Page
            </button>
            Page {page}
            <button className="ml-auto" onClick={() => setPage(page + 1)}>
               Next Page
            </button>
         </div>
      </div>
   )
}

function TimelineChunk({ chunk }: { chunk: TimelineDataChunk }) {
   const [showNew, setState] = useState(true)

   const nothingChanged = !chunk.newTitle && !chunk.newText

   const title =
      chunk.newTitle && showNew ? (
         <>
            <p hidden={!chunk.oldTitle} className="line-through text-red-700 mr-2">
               {chunk.oldTitle}
            </p>
            <p>{chunk.newTitle}</p>
         </>
      ) : (
         chunk.oldTitle
      )

   let text: string | JSX.Element[]
   if (nothingChanged) text = []
   else if (chunk.newText)
      text = diffWords(chunk.oldText, chunk.newText).flatMap((part, i) => {
         if (part.removed && showNew) return []
         if (part.added && !showNew) return []

         const color = part.added ? "" : part.removed ? "text-red-600" : ""

         return [
            <span key={i} className={`${color}`}>
               {part.value}
            </span>,
         ]
      })
   else text = chunk.oldText

   return (
      <div>
         <div
            className="card cursor-pointer"
            onClick={() => {
               const card = cardStore.records.get(chunk.cardId)
               if (!card) {
                  toast("Can't find card on board, it may have been deleted")
               } else {
                  card.centerOnScreen()
               }
            }}
         >
            <div className="flex flex-1">
               <div className="flex-1 p-3">
                  <div className="flex">
                     <span className="flex title">{title ? title : <span className="italic">Untitled</span>}</span>
                     <button
                        hidden={nothingChanged}
                        className="w-[60px] text-[14px]"
                        onClick={() => setState(!showNew)}
                     >
                        {showNew ? (
                           <span className="bold text-green-600">New</span>
                        ) : (
                           <span className="bold text-red-600">Old</span>
                        )}
                     </button>
                  </div>

                  <div className="p-2 pt-0 whitespace-pre-wrap" hidden={nothingChanged}>
                     {!text || !text.length ? <span className="italic">blank</span> : text}
                  </div>
               </div>
            </div>
         </div>
      </div>
   )
}

export const Timeline = observer(TimelineComponent)
