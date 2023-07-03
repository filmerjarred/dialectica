import { getLocalLog } from "../lib/localLog"
import { useEffect, useState } from "react"
import { ReadOnlyEditor } from "./ReadOnlyEditor"

const noop = () => {}

export function LocalLog() {
   const [x, setX] = useState([])
   const logs = getLocalLog()

   useEffect(() => {
      logs.then((t) => {
         // @ts-ignore
         setX(t)
      })
   }, [])

   return (
      <div
         style={{
            position: "absolute",
            height: "calc(100% - 50px)",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: 50,
            background: "#cdcdcd",
            marginTop: "50px",
            zIndex: 9999,
            overflow: "auto",
         }}
      >
         {x.map((log, i) => {
            return (
               <div key={i} className="card">
                  <div className="p-3">
                     {/* @ts-ignore */}
                     <ReadOnlyEditor text={JSON.stringify(log.text)}></ReadOnlyEditor>
                  </div>
               </div>
            )
         })}
      </div>
   )
}
