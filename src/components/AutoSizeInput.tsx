import { observer } from "mobx-react"
import { useEffect, useRef, useState } from "react"

export const AutosizeInput = observer(function AutosizeInput({
   value,
   className,
   onChange,
   inputRef,
   onClick,
}: {
   value?: string
   className?: string
   onChange: React.ChangeEventHandler<HTMLInputElement>
   onClick?: React.MouseEventHandler
   inputRef?: React.RefObject<HTMLInputElement>
}) {
   const [cursor, setCursor] = useState(0)

   inputRef = inputRef || useRef<HTMLInputElement>(null)

   useEffect(() => {
      if (inputRef!.current) {
         inputRef!.current.setSelectionRange(cursor, cursor)
      }
   }, [inputRef, value, cursor])

   function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
      setCursor(e.target.selectionStart || 0)
      onChange(e)
   }

   return (
      <span style={{ position: "relative", minWidth: 2 }}>
         <input
            className={className}
            onMouseDown={onClick}
            onClick={(e) => {
               e.stopPropagation()
            }}
            onMouseUp={(e) => {
               e.stopPropagation()
            }}
            ref={inputRef}
            style={{ position: "absolute", zIndex: 10, outline: "none", width: "100%" }}
            onChange={onInputChange}
            value={value}
         />
         <span style={{ opacity: 0, display: "inline-block", minWidth: value ? "max-content" : 1 }}>{value}</span>
      </span>
   )
})
