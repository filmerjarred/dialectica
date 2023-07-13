import { observer } from "mobx-react"
import { CardRecord, Side, cardStore } from "../lib/card.data"
import { BoardRecord } from "../lib/board.data"

export const FoldController = observer(function Dropdown<T>({
   children,
   side,
   cardOrBoard,
}: {
   children: JSX.Element | JSX.Element[]
   side: Side
   cardOrBoard: CardRecord | BoardRecord
}) {
   const horizontalDoubleChevronClick = (roll: boolean) => {
      if (roll) {
         cardOrBoard.rollAll(side)
         cardStore.setSelected(null)
      } else {
         cardOrBoard.unrollAll(side)
      }
   }

   const horizontalSingleChevronClick = (roll: boolean) => {
      if (roll) {
         cardOrBoard.roll(side)
         cardStore.setSelected(null)
         cardOrBoard.updateRollOutlines(true)
      } else {
         cardOrBoard.unroll(side)
      }
   }

   return (
      <div className={`card-controls`}>
         <div
            onClick={(e) => {
               cardOrBoard.collapseAllDescendentText(side)
            }}
            className={`control-circle control-circle-large top-row pb-[1px]`}
         >
            <i className="fal fa-chevron-double-up"></i>
         </div>

         <div className="central-row">
            <div className="left-col">
               <div
                  title="Roll up all cards downstream of this card"
                  onClick={() => horizontalDoubleChevronClick(side === Side.LEFT)}
                  className={`control-circle control-circle-large pr-[1px]`}
               >
                  <i className="fal fa-chevron-double-left"></i>
               </div>

               <div
                  className={`control-circle control-circle-large pr-[2px]`}
                  title="Roll up the outermost edge of the tree one layer"
                  onClick={() => horizontalSingleChevronClick(side === Side.LEFT)}
               >
                  <i className="fal fa-chevron-left"></i>
               </div>
            </div>

            {children}

            <div className="right-col">
               <div
                  className={`control-circle control-circle-large pl-[2px]`}
                  title="Unroll all cards downstream of this card"
                  onClick={() => horizontalDoubleChevronClick(side === Side.RIGHT)}
               >
                  <i className="fal fa-chevron-double-right"></i>
               </div>

               <div
                  title="Unroll one layer at the outermost edge of the tree"
                  className={`control-circle control-circle-large pl-[1px]`}
                  onClick={() => horizontalSingleChevronClick(side === Side.RIGHT)}
               >
                  <i className="fal fa-chevron-right"></i>
               </div>
            </div>
         </div>

         <div
            onClick={(e) => {
               cardOrBoard.uncollapseAllDescendentText(side)
            }}
            title="Show the text for all cards downstream of this card"
            className={`control-circle control-circle-large bottom-row`}
         >
            <i className="fal fa-chevron-double-down pt-[1px]"></i>
         </div>
      </div>
   )
})
