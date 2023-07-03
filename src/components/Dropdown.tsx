import { observer } from "mobx-react"
import { useState } from "react"

export const Dropdown = observer(function Dropdown<T>({
   options,
   selectedOption,
   onSelect,
   renderOption,
   renderSelection,
}: {
   options: T[]
   selectedOption: T
   onSelect: (selection: T) => any
   renderOption: (selection: T) => JSX.Element
   renderSelection?: (selection: T) => JSX.Element
}) {
   const [showOptions, setShowOptions] = useState(false)

   return (
      <span className="relative ml-1 h-[12px] block cursor-pointer " onClick={() => setShowOptions(true)}>
         {renderSelection ? renderSelection(selectedOption) : renderOption(selectedOption)}

         {!showOptions ? null : (
            <span className="absolute left-[-64px] top-[15px] block z-[99]">
               <span className="flex flex-col border border-black block bg-white z-[999] cursor-pointer border-b-0">
                  {options.map((option, index) => (
                     <span
                        key={index}
                        onClick={() => {
                           setShowOptions(false)
                           onSelect(option)
                        }}
                        className={`whitespace-nowrap hover:bg-[#00a7dfe3] border-b border-black p-[2px]`}
                     >
                        {renderOption(option)}
                     </span>
                  ))}
               </span>
            </span>
         )}
      </span>
   )
})
