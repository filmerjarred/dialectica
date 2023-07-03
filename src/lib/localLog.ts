import { IDBPDatabase, openDB } from "idb/with-async-ittr"
import _ from "lodash"

let db: IDBPDatabase
;(async () => {
   db = await openDB("Log2", 1, {
      upgrade(db) {
         // Create a store of objects
         const store = db.createObjectStore("log2", {
            // The 'id' property of the object will be the key.
            keyPath: "id",
            // If it isn't explicitly set, create a value by auto incrementing.
            autoIncrement: true,
         })
         // Create an index on the 'date' property of the objects.
         store.createIndex("time", "time")
      },
   })
})()

export function saveToLocalLog(text: string) {
   if (!text) return

   // todo
   // db.add("log2", { text, time: Date.now() })
}

export async function getLocalLog() {
   const logs = await db.getAllFromIndex("log2", "time", null, 100)
   return logs
}
