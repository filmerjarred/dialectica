import { useMemo } from "react"
import { AnchorPositionType, RelationType } from "react-archer/lib/types"
import { CardLocationType, CardRecord, GutterItem, Side } from "./card.data"

// archer id for attaching to the border of the card
export const getCardBorderArcherId = ({ card, gutterItem }: { card: CardRecord; gutterItem?: GutterItem }) =>
   card.id + "-" + card.side + !!gutterItem

export const getRelatedCardsCollapseCircleArcherId = ({ card, side }: { card: CardRecord; side: Side }) =>
   card.id + "-" + side

export const getUserCircleArcherId = ({ boardId, side }: { boardId: string; side: Side }) => `${boardId}-${side}`

export const getParagraphCardGutterCenterLeft = ({
   paragraphParentCardId,
   paragraphId,
}: {
   paragraphParentCardId: string
   paragraphId: string
}) => paragraphParentCardId + paragraphId

export function useArcherRelations({
   card,
   isAnchor,
   side,
   overhead,
   gutterItem,
}: {
   card: CardRecord
   isAnchor?: boolean
   side: Side
   overhead?: boolean
   gutterItem?: GutterItem
}) {
   return useMemo(() => {
      let targetId
      if (card.cardLocationType === CardLocationType.PARAGRAPH && !card.parent) {
         targetId = getParagraphCardGutterCenterLeft({
            paragraphId: card.paragraphId!,
            paragraphParentCardId: card.paragraphParent!.id,
         })
      } else if (card.parent) {
         targetId = getRelatedCardsCollapseCircleArcherId({ card: card.parent, side })
      } else {
         targetId = getUserCircleArcherId({ boardId: card.boardId, side })
      }

      let targetAnchor: AnchorPositionType
      if (side === Side.TOP) targetAnchor = "bottom"
      else if (side === Side.LEFT) targetAnchor = "right"
      else if (side === Side.RIGHT) targetAnchor = "left"
      else throw new Error("invalid side")

      let sourceAnchor: AnchorPositionType
      if (side === Side.TOP) sourceAnchor = "top"
      else if (side === Side.LEFT) sourceAnchor = "left"
      else if (side === Side.RIGHT) sourceAnchor = "right"
      else throw new Error("invalid side")

      const relations: RelationType[] =
         isAnchor || overhead || gutterItem || (card.parent?.exploded && card.parent.isMine)
            ? []
            : [
                 {
                    targetId,
                    targetAnchor,
                    sourceAnchor,
                 },
              ]

      return {
         relations,
      }
   }, [card.id, side, card.side, isAnchor, overhead, gutterItem, card.parent?.exploded && card.parent.isMine])
}
