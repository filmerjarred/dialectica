import { observer } from "mobx-react"
import { ArcherElement } from "react-archer"
import { BoardRecord, boardStore } from "../lib/board.data"
import { cardStore, CardLocationType, Side } from "../lib/card.data"
import { getUserCircleArcherId } from "../lib/useArcherRelations"
import { UserRecord, userStore } from "../lib/user.data"
import { FoldController } from "./FoldController"

export const MessageCircle = observer(function MessageCircle() {
   const board = boardStore.getCurrentBoard()

   const user = userStore.getUserRecord()

   async function addMessage() {
      const card = cardStore.create({
         boardId: board.id,
         ownerUserId: user.id,
         order: 0,
         parentId: null,
         paragraphId: null,
         paragraphParentCardId: null,
         cardLocationType: CardLocationType.DISCUSSION,
         treeUserId: board.leftUser.id, // shouldn't matter, as treeUserId only informs side and side is overriden for discussions
      })
   }

   return (
      <div className={`user-image-circle-wrapper`}>
         <ArcherElement id={getUserCircleArcherId({ boardId: board.id, side: Side.LEFT })}>
            <div
               onClick={addMessage}
               className="fade-target user-image-circle text-xl flex items-center justify-center"
            >
               📫
            </div>
         </ArcherElement>
      </div>
   )
})

export const UserCircle = observer(function UserCircle({ side, user }: { side: Side; user: UserRecord }) {
   const board = boardStore.getCurrentBoard()

   const userOnBoard = board.userIds.includes(user.id)

   if (userOnBoard) {
      return (
         <div className={`fade-target user-image-circle-wrapper ${side === Side.LEFT ? "pl-[40px]" : "pr-[40px]"}`}>
            <FoldController side={side} cardOrBoard={board}>
               <ArcherElement id={getUserCircleArcherId({ boardId: board.id, side })}>
                  <img className="user-image-circle" src={user.pic}></img>
               </ArcherElement>
            </FoldController>
         </div>
      )
   } else if (side === Side.RIGHT) {
      return (
         <div className="user-image-circle-wrapper">
            <p
               className="user-image-circle flex items-center justify-center text-center text-sm"
               onClick={async () => {
                  const users = [...board.userIds, user.id]
                  await board.update({ userIds: users }, true)

                  cardStore.create({
                     boardId: board.id,
                     ownerUserId: user.id,
                     paragraphId: null,
                     paragraphParentCardId: null,
                     order: 0,
                     parentId: null,
                     cardLocationType: CardLocationType.POSITION,
                     treeUserId: user.id,
                  })
               }}
            >
               Click to Join
            </p>
         </div>
      )
   } else {
      return null
   }
})
