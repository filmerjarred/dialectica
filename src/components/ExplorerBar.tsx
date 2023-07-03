import { observer } from "mobx-react"
import { boardStore } from "../lib/board.data"
import { CardRecord, Side, cardStore } from "../lib/card.data"
import _ from "lodash"
import { UserRecord, userStore } from "../lib/user.data"
import { useCallback, useState } from "react"
import { TodoRecord, todoStore } from "../lib/todo.data"
import { Todos } from "./Todo"
import { uiStore } from "../lib/ui.data"
import { useDrop } from "react-dnd"
import { DragAndDropTypes } from "./Board"

function collapseAll(toCollapse: CardRecord[] | TodoRecord[], collapsed: boolean) {
   toCollapse.forEach((item) => {
      if (item.children.length) {
         if (item instanceof CardRecord) {
            item.updateLocal({ explorerRelatedCollapsed: collapsed })
         } else {
            item.toggleRelated(collapsed)
         }
         collapseAll(item.children, collapsed)
      }
   })
}

export const Explorer = observer(function Explorer({ side }: { side: Side }) {
   const user = userStore.getUserRecord()
   const board = boardStore.getCurrentBoard()
   const partner = board.partner!

   if (!partner && side === Side.RIGHT) return null

   const cards = side === Side.LEFT ? board.leftRoots : board.rightRoots
   const todos = (side === Side.LEFT ? board.userTodoRoots : board.partnerTodoRoots).filter((t) => t.show)
   const inbox = (side === Side.LEFT ? board.userInboxRoots : board.partnerInboxRoots).filter((t) => t.show)

   const todosMinHeight = uiStore.getShowTodo(side)
      ? (todos.length + 1) * 30 > 200
         ? 200
         : (todos.length + 1) * 30
      : 32
   const inboxMinHeight = uiStore.getShowInbox(side)
      ? (inbox.length + 1) * 30 > 200
         ? 200
         : (inbox.length + 1) * 30
      : 32
   const discussionMinHeight =
      uiStore.showDiscussion && side === Side.LEFT
         ? (board.discussionRoots.length + 1) * 40 > 200
            ? 200
            : (board.discussionRoots.length + 1) * 40
         : 36

   const makeTodo = (isInInbox: boolean) => {
      const userToUse = side === Side.RIGHT ? partner : user

      return todoStore.create({
         boardId: board.id,
         createdByUserId: user.id,
         isHeader: false,
         isInInbox,
         order: todos.length,
         parentId: null,
         userId: userToUse.id,
      })
   }

   return (
      <div className="explorer-panel flex flex-col overflow-hidden">
         {/* TODO */}
         <div className="flex flex-col overflow-hidden mb-2" style={{ minHeight: todosMinHeight }}>
            <div className="flex bg-slate-200 p-1 flex items-center">
               <span className="font-bold ml-3 cursor-pointer" onClick={() => uiStore.toggleShowTodo(side)}>
                  📋 {side === Side.LEFT ? "" : "Partner"} Todo
               </span>

               <i
                  hidden={side === Side.RIGHT}
                  onClick={() => {
                     uiStore.toggleShowTodo(side, true)
                     makeTodo(false).focusCursor()
                  }}
                  className="ml-auto cursor-pointer fal fa-plus-square"
                  title="Create todo"
               ></i>

               {side === Side.LEFT ? (
                  <i
                     title="Hide non active"
                     onClick={() => uiStore.toggleHideInactive()}
                     className={`ml-2 cursor-pointer fal ${uiStore.hideInactiveTodo ? "fa-rocket" : "fa-thumbtack"}`}
                  ></i>
               ) : null}

               <i
                  title="Collapse all items"
                  onClick={() => collapseAll(todos, true)}
                  className={`${side === Side.RIGHT ? "ml-auto" : ""} ml-2 cursor-pointer fal fa-minus-square`}
               ></i>

               <i
                  title="Show done"
                  onClick={() => uiStore.toggleShowOldDone(side, false)}
                  className={`ml-2 cursor-pointer fal ${
                     uiStore.getShowOldDone(side, false) ? "fa-eye" : "fa-eye-slash"
                  }`}
               ></i>

               <i
                  title="Collapse todo section (you can also click the title)"
                  onClick={() => uiStore.toggleShowTodo(side)}
                  className={`ml-2 mr-2 cursor-pointer fal fa-chevron-square-${
                     uiStore.getShowTodo(side) ? "down" : "up"
                  }`}
               ></i>
            </div>

            {uiStore.getShowTodo(side) && (
               <div className="scrollable">
                  <Todos todos={todos} level={1}></Todos>
               </div>
            )}
         </div>

         {/* INBOX */}
         <div className="flex flex-col overflow-hidden mb-2 min-h-[32px]" style={{ minHeight: inboxMinHeight }}>
            <div className="flex bg-slate-200 p-1 flex items-center">
               <span className="font-bold ml-3 cursor-pointer" onClick={() => uiStore.toggleShowInbox(side)}>
                  💌 {side === Side.LEFT ? "" : "Partner"} Inbox
               </span>

               <i
                  onClick={() => {
                     uiStore.toggleShowInbox(side, true)
                     makeTodo(true).focusCursor()
                  }}
                  className="ml-auto cursor-pointer fal fa-plus-square"
                  title="Create item in inbox"
               ></i>

               <i
                  onClick={() => collapseAll(inbox, true)}
                  className={`ml-2 cursor-pointer fal fa-minus-square`}
                  title="Collapse all items"
               ></i>

               <i
                  onClick={() => uiStore.toggleShowOldDone(side, true)}
                  title="Show done"
                  className={`ml-2 cursor-pointer fal ${
                     uiStore.getShowOldDone(side, true) ? "fa-eye" : "fa-eye-slash"
                  }`}
               ></i>

               <i
                  title="Collapse the inbox section (you can also click the title)"
                  onClick={() => uiStore.toggleShowInbox(side)}
                  className={`ml-2 mr-2 cursor-pointer fal fa-chevron-square-${
                     uiStore.getShowInbox(side) ? "down" : "up"
                  }`}
               ></i>
            </div>

            {uiStore.getShowInbox(side) && (
               <div className="scrollable">
                  <Todos todos={inbox} level={1}></Todos>
               </div>
            )}
         </div>

         {/* DISCUSSION */}
         {side === Side.LEFT ? (
            <div
               className="flex flex-col flex flex-col overflow-hidden mb-2"
               style={{ minHeight: discussionMinHeight }}
            >
               <div className="flex bg-slate-200 p-1 flex items-center">
                  <span className="font-bold ml-3 cursor-pointer" onClick={() => uiStore.toggleShowDiscussion()}>
                     📫 Discussion
                  </span>

                  <i
                     onClick={() => uiStore.toggleShowDiscussionArchived()}
                     className={`ml-auto cursor-pointer fal ${
                        uiStore.showDiscussionArchived ? "fa-eye" : "fa-eye-slash"
                     }`}
                  ></i>
                  <i
                     onClick={() => collapseAll(board.discussionRoots, true)}
                     className="ml-2 cursor-pointer fal fa-minus-square"
                  ></i>
                  <i
                     onClick={() => uiStore.toggleShowDiscussion()}
                     className={`mr-2 ml-2 cursor-pointer fal fa-chevron-square-${
                        uiStore.showDiscussion ? "down" : "up"
                     }`}
                  ></i>
               </div>

               {uiStore.showDiscussion ? (
                  <div className="scrollable">
                     <Cards
                        cards={board.discussionRoots}
                        showArchived={uiStore.showDiscussionArchived}
                        level={1}
                     ></Cards>
                  </div>
               ) : null}
            </div>
         ) : null}

         {/* CLAIMS */}
         <div className="flex flex-col overflow-hidden min-h-[32px]">
            <div className="flex bg-slate-200 p-1 flex items-center">
               <span className="ml-3  whitespace-nowrap">
                  <span className="font-bold">📜 Claims & Positions</span>

                  <span
                     className="text-xs ml-2 cursor-pointer"
                     hidden={!cardStore.currentSelected}
                     onClick={() => cardStore.currentSelected?.centerOnScreen()}
                  >
                     [[
                     <span className="underline ellipsis max-w-[130px] table-cell">
                        {cardStore.currentSelected?.title}
                     </span>
                     ]]
                  </span>
               </span>

               <i
                  onClick={() => uiStore.toggleShowClaimsArchived()}
                  className={`ml-auto cursor-pointer fal ${uiStore.showClaimsArchived ? "fa-eye" : "fa-eye-slash"}`}
               ></i>

               <i onClick={() => collapseAll(cards, true)} className="ml-2 cursor-pointer fal fa-minus-square"></i>

               <i
                  onClick={() => uiStore.toggleShowOnlyAnchors()}
                  className={`ml-2 cursor-pointer fal fa-bullseye ${
                     uiStore.showOnlyAnchors ? "fa-bullseye" : "fa-dot-circle"
                  }`}
               ></i>

               <i
                  onClick={() => uiStore.toggleShowClaims(side)}
                  className={`mr-2 ml-2 cursor-pointer fal fa-chevron-square-${
                     uiStore.getShowClaims(side) ? "down" : "up"
                  }`}
               ></i>
            </div>

            {uiStore.getShowClaims(side) && (
               <div className="scrollable min-h-[400px]">
                  <Cards cards={cards} showArchived={uiStore.showClaimsArchived} level={1}></Cards>
               </div>
            )}
         </div>
      </div>
   )
})

export const Cards = observer(function Cards({
   cards,
   level,
   showArchived,
}: {
   cards: CardRecord[]
   level: number
   showArchived: boolean
}) {
   const orderedCards = _.orderBy(cards, (c) => {
      if (c.isArchived) {
         return c.order * 1000
      } else {
         return c.order
      }
   })

   return (
      <div className="flex flex-col">
         {orderedCards.map((card, i) => (
            <CardLine showArchived={showArchived} key={card.id} card={card} level={level} />
         ))}
      </div>
   )
})

const CardLine = observer(function CardLine({
   card,
   level,
   showArchived,
}: {
   card: CardRecord
   level: number
   showArchived: boolean
}) {
   if (!showArchived && card.isArchived) return null

   function onCollapse(e: React.MouseEvent) {
      if (e.ctrlKey) {
         collapseAll([card], !card.local.explorerRelatedCollapsed)
      } else {
         card.updateLocal({ explorerRelatedCollapsed: !card.local.explorerRelatedCollapsed })
      }
   }

   function onNavigate(e: React.MouseEvent) {
      if (e.altKey) card.toggleHide()
      else card.centerOnScreen()
   }

   const className = `card-line explorer-line ${card.myUserData.isHidden ? "hidden" : ""} ${
      card.isSelected ? "focused" : ""
   } ${card.isCentralPosition ? "central-position" : ""} ${card.isAgreed ? "agreed" : ""} ${
      card.isArchived ? "archived" : ""
   }`

   return (
      <div className="card-and-children">
         {level > 1 ? <div className="indent-line" style={{ left: 17 * level - 3 }}></div> : null}

         {/* card line */}
         <div
            className={className}
            style={{
               paddingLeft: 17 * level + 5,
               display: !card.isSelected && uiStore.showOnlyAnchors && !card.isCentralPosition ? "none" : undefined,
            }}
         >
            <div className="relative">
               {/* <span className="button__badge"></span> */}
               <img className="card-user m-1" src={card.leftUser.pic} onClick={onCollapse} />
            </div>

            <div className="flex-1 p-[3px]" onClick={onNavigate}>
               <span className="relative">{card.title || " "}</span>
            </div>

            <div className="ml-auto actions">
               {card.local.explorerRelatedCollapsed ? (
                  <i onClick={onCollapse} className="collapse-toggle far fa-chevron-up"></i>
               ) : (
                  <i onClick={onCollapse} className="invisible collapse-toggle far fa-chevron-down"></i>
               )}

               <i
                  onClick={card.toggleHide}
                  className={`hide-toggle invisible far ${card.myUserData.isHidden ? "fa-eye-slash" : "fa-eye"}`}
               ></i>
            </div>
         </div>

         {/* nested child cards */}
         {card.children && !card.local.explorerRelatedCollapsed ? (
            <div className="relative">
               <Cards cards={card.children} level={level + 1} showArchived={showArchived}></Cards>
            </div>
         ) : null}
      </div>
   )
})
