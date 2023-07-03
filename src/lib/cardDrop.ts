import { useDrop } from "react-dnd"
import { DragAndDropTypes } from "../components/Board"
import { CardRecord, allDescendentAndRoot, cardStore } from "./card.data"
import { toast } from "react-toastify"

export function useCardDrop(card: CardRecord, updateData: (card: CardRecord) => Partial<CardRecord>) {
   return useDrop(
      () => ({
         accept: DragAndDropTypes.CARD,
         drop: (draggedCard: CardRecord) => {
            if (draggedCard.isMine) {
               draggedCard.update({ ...updateData(card) })

               allDescendentAndRoot(draggedCard, (c) => c.update({ treeUserId: card.treeUserId }))

               draggedCard.reconcilePeerOrder()
               cardStore.setSelected(draggedCard)
            } else {
               toast("You can't re-order your partner's cards")
            }
         },
         collect: (monitor) => ({
            canDrop: !!monitor.canDrop(),
         }),
      }),
      [card]
   )
}
