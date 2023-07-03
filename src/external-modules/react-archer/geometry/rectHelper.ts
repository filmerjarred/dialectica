import Vector2 from "./Vector2"
import { AnchorPositionType } from "../types"

function rectToPoint(rect: DOMRect): Vector2 {
   return new Vector2(rect.left, rect.top)
}

function computeCoordinatesFromAnchorPosition(anchorPosition: AnchorPositionType, rect: DOMRect): Vector2 | null {
   switch (anchorPosition) {
      case "top":
         return rectToPoint(rect).add(new Vector2(rect.width / 2, 0))

      case "bottom":
         return rectToPoint(rect).add(new Vector2(rect.width / 2, rect.height))

      case "left":
         return rectToPoint(rect).add(new Vector2(0, rect.height / 2))

      case "right":
         return rectToPoint(rect).add(new Vector2(rect.width, rect.height / 2))

      case "middle":
         return rectToPoint(rect).add(new Vector2(rect.width / 2, rect.height / 2))

      default:
         console.error("[React Archer] Invalid anchor position was provided. Not drawing the arrow.")
         return null
   }
}

const getRectFromElement = (element: HTMLElement | null | undefined): DOMRect | null | undefined => {
   if (!element) return null
   return element.getBoundingClientRect()
}

export const getPointFromElement = (element: HTMLDivElement | null | undefined): Vector2 | null => {
   const rectp = getRectFromElement(element)

   if (!rectp) {
      return null
   }

   return rectToPoint(rectp)
}

export const getPointCoordinatesFromAnchorPosition = (
   position: AnchorPositionType,
   index: string,
   parentCoordinates: Vector2,
   refs: Record<string, HTMLElement>,
   scale: number
): Vector2 | null => {
   const rect = getRectFromElement(refs[index])

   if (!rect) {
      return null
   }

   const absolutePosition = computeCoordinatesFromAnchorPosition(position, rect)

   if (!absolutePosition) {
      return null
   }

   // absolutePosition.x = absolutePosition.x * scale
   // absolutePosition.y = absolutePosition.y * scale

   // parentCoordinates.x = parentCoordinates.x * scale
   // parentCoordinates.y = parentCoordinates.y * scale

   var retPos = absolutePosition.substract(parentCoordinates)
   retPos.x = retPos.x / scale
   retPos.y = retPos.y / scale

   // if (
   //    position === "left" &&
   //    refs[index].attributes.getNamedItem("bla").value === "077607a7-6497-4608-9294-f7afade2bff3"
   // ) {
   //    console.log("---")
   //    console.log(scale)
   //    console.log(rect)
   //    console.log("element pos", absolutePosition)
   //    console.log("parent pos", parentCoordinates)
   //    console.log("diff pos", retPos)
   //    console.log("---")
   // }

   return retPos
}
