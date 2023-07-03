import {
   onSnapshot,
   collection,
   updateDoc,
   DocumentReference,
   CollectionReference,
   QuerySnapshot,
   doc,
   setDoc,
   deleteDoc,
   query,
   where,
   Query,
   queryEqual,
   Unsubscribe,
   DocumentSnapshot,
   refEqual,
} from "firebase/firestore"
import { runInAction, makeObservable, observable, action } from "mobx"
import { uuidv4 } from "@firebase/util"
import { db } from "./firebase"
import { SetOptional } from "type-fest"
import { isDev } from "./isDev"
import { Resolvable } from "./createResolvable"
import { createResolvable } from "./createResolvable"
import _ from "lodash"
import { trace } from "console"
import { toast } from "react-toastify"
import * as Sentry from "@sentry/react"

// Enable navigation prompt
window.onbeforeunload = function (e) {
   if (Object.keys(delayedUpdateMap).length) {
      return true
   }
}

export abstract class Record<T> {
   id!: string
   static defaults: { [i: string]: any }
   static mappings?: { [i: string]: any }

   ref!: DocumentReference<typeof this>
   store!: Store<any, any>

   updateCheck(): boolean {
      return true
   }

   update(data: Partial<T>, wait?: boolean): Promise<any> {
      if (this.updateCheck) {
         if (!this.updateCheck()) {
            console.error("Update check failed")
            return Promise.resolve(false)
         }
      }

      if (!wait) {
         runInAction(() => {
            mergeDeep(this, data)
         })
      } else {
         return updateDocument(this, data)
      }

      if (delayedUpdateMap[this.id]) {
         mergeDeep(delayedUpdateMap[this.id].data, data)
         delayedUpdateMap[this.id].fn()
      } else {
         delayedUpdateMap[this.id] = {
            fn: _.throttle(
               () => {
                  if (!delayedUpdateMap[this.id].deleted) {
                     const data = delayedUpdateMap[this.id].data
                     updateDocument(this, data)
                  }
                  delete delayedUpdateMap[this.id]
               },
               2000,
               { leading: false, trailing: true }
            ),
            data,
         }
         delayedUpdateMap[this.id].fn()
      }

      return Promise.resolve(true)
   }

   delete() {
      if (this.updateCheck) {
         if (!this.updateCheck()) {
            console.error("Update check failed")
            return false
         }
      }

      runInAction(() => {
         this.store.records.delete(this.id)
      })

      if (delayedUpdateMap[this.id]) {
         delayedUpdateMap[this.id].deleted = true
      }

      return deleteDoc(this.ref)
   }
}

export const errorAlert = _.throttle(
   (e: any, update?: boolean) => {
      Sentry.captureException(e)

      toast.error(
         `The app has just errored.\n${
            update ? 'If you just wrote something, you may close it\nIf so, it should be saved under "Log".\n' : ""
         }The developers have been notified.\n.Reloading the page may fix the issue.`,
         { autoClose: false }
      )
   },
   3000,
   { leading: true, trailing: false }
)

const delayedUpdateMap: { [i: string]: { fn: (args?: any) => void; data: any; deleted?: boolean } } = {}

// Enable navigation prompt
window.onbeforeunload = function () {
   if (Object.keys(delayedUpdateMap).length) {
      return true
   } else {
      return null
   }
}

function updateDocument(record: any, data: any) {
   try {
      console.log("updating", record.ref.path)
      // @ts-ignore
      return updateDoc(record.ref, data).catch((e) => {
         // @ts-ignore
         console.error("async error in update", record.ref.path, e.stack, data)
         errorAlert(e, true)
      })
   } catch (e) {
      console.error("sync error in update", e)
      errorAlert(e)
      throw e
   }
}

function createRecord(docRef: any, createData: any, collection: any) {
   try {
      return setDoc(docRef, createData).catch((e) => {
         console.error("async error in create", collection.path, e.stack, docRef, createData)
         errorAlert(true)
      })
   } catch (e) {
      console.error("error in create", e)
      errorAlert(e)
      throw e
   }
}

export class Store<RecordClass extends typeof Record, RecordType extends Record<RecordType>> {
   @observable loaded = false
   @observable loading = false
   @observable records: Map<string, RecordType>

   loadingResolvable: null | Resolvable = null

   collection: CollectionReference<RecordType>
   recordType: RecordClass
   recordQueries: (Query<RecordType> | DocumentReference)[] = []

   unsubscribeFns: Unsubscribe[] = []

   constructor(recordType: RecordClass, name: string) {
      this.collection = collection(db, name) as CollectionReference<RecordType>
      this.recordType = recordType
      this.records = new Map()
   }

   unsubscribe() {
      this.unsubscribeFns.forEach((fn) => fn())
   }

   init() {
      makeObservable(this)
      return this
   }

   makeEnhancedRecord(ref: DocumentReference<RecordType>, data: RecordType): RecordType {
      // @ts-ignore
      const record = new this.recordType() as RecordType

      let update = false
      if (this.recordType.mappings) {
         for (const i in this.recordType.mappings) {
            const oldField = i
            const newField = this.recordType.mappings[i]

            // @ts-ignore
            if (data[newField] === undefined && data[oldField] !== undefined) {
               let update = true
               // @ts-ignore
               data[newField] = data[oldField]
            }
         }
      }

      mergeDeep(record, _.cloneDeep(this.recordType.defaults), data)

      if (update) {
         record.update({})
      }

      makeObservable(record)

      Object.defineProperties(record, {
         ref: { value: ref, enumerable: false },
         store: { value: this, enumerable: false },
         // update: { value: updateRecord, enumerable: false },
         // delete: { value: deleteRecord, enumerable: false },
      })

      return record as unknown as RecordType
   }

   onRecordsUpdate(snapshot: QuerySnapshot<RecordType> | DocumentSnapshot<RecordType>) {
      runInAction(() => {
         const doc = (snapshot as any).id ? (snapshot as DocumentSnapshot<RecordType>) : null
         const collection = (snapshot as any).id ? null : (snapshot as QuerySnapshot<RecordType>)

         if (doc && doc.id !== "null" && doc.id !== "undefined") {
            const existing = this.records.get(doc.id)
            if (!existing) {
               this.records.set(doc.id, this.makeEnhancedRecord(doc.ref, doc.data()!))
            } else {
               mergeDeep(existing, doc.data() as RecordType)
            }
         } else if (collection) {
            for (const docChange of collection.docChanges()) {
               const doc = docChange.doc
               const existing = this.records.get(doc.id)

               if (docChange.type === "removed") {
                  this.records.delete(doc.id)
               } else if (docChange.type === "added" && !existing) {
                  this.records.set(doc.id, this.makeEnhancedRecord(doc.ref, doc.data()))
               } else if (docChange.type === "modified" && existing) {
                  mergeDeep(existing, doc.data() as RecordType)
               }
            }
         }
      })
   }

   @action
   loadRecords(
      recordQueries: (Query<RecordType> | DocumentReference<RecordType>)[] = [this.collection],
      suppressLoadError?: boolean
   ) {
      const store = this

      // ASSUMES WE NEVER GO FROM NO QUERY TO A QUERY
      if ((store.loading || store.loaded) && recordQueries.length) {
         const larger = store.recordQueries.length > recordQueries.length ? store.recordQueries : recordQueries

         const queriesTheSame = larger.every((query, i) => {
            if (store.recordQueries[i]?.type === "document" && recordQueries[i]?.type === "document") {
               return refEqual(store.recordQueries[i] as DocumentReference, recordQueries[i] as DocumentReference)
            } else if (store.recordQueries[i]?.type === recordQueries[i]?.type) {
               return queryEqual(store.recordQueries[i] as Query, recordQueries[i] as Query)
            } else {
               return false
            }
         })

         if (!queriesTheSame) {
            // query changed, let's reload
            store.unsubscribe!()
            store.loading = false
            store.loaded = false
            this.records.clear()
         }
      }

      store.recordQueries = recordQueries

      if (!store.loaded && !store.loading) {
         store.loading = true
         store.loadingResolvable = createResolvable()
         this.unsubscribeFns = []
         const promises: Promise<any>[] = []

         recordQueries.forEach((query) => {
            const { promise, resolve, reject } = createResolvable()
            promises.push(promise)

            this.unsubscribeFns.push(
               // @ts-ignore
               onSnapshot(query, {
                  next(snapshot) {
                     if (!store.loaded) {
                        resolve()
                     }
                     store.onRecordsUpdate(snapshot)
                  },
                  error(e) {
                     console.log("error in subscribe", store.collection.path, query, e)
                     if (!suppressLoadError) {
                        // issues.md#1
                        Sentry.captureException(e)
                     }
                     reject(e)
                  },
               })
            )
         })

         Promise.all(promises)
            .then(() => {
               runInAction(() => {
                  store.loading = false
                  store.loaded = true
                  store.loadingResolvable?.resolve()
               })
            })
            .catch((e) => {
               runInAction(() => {
                  store.loading = false
                  store.loaded = false
               })
               store.loadingResolvable?.reject(e)
            })
      }

      return store.records
   }

   create(
      data: WritablePart<
         Omit<
            SetOptional<RecordType, keyof RecordClass["defaults"] | "id" | "ref" | "store">,
            FunctionPropertyNames<RecordType>
         >
      >,
      wait?: true
   ): RecordType
   create(
      data: WritablePart<
         Omit<
            SetOptional<RecordType, keyof RecordClass["defaults"] | "id" | "ref" | "store">,
            FunctionPropertyNames<RecordType>
         >
      >,
      wait?: false
   ): Promise<RecordType>
   @action
   create(
      data: WritablePart<
         Omit<
            SetOptional<RecordType, keyof RecordClass["defaults"] | "id" | "ref" | "store">,
            FunctionPropertyNames<RecordType>
         >
      >,
      wait?: boolean
   ): Promise<RecordType> | RecordType {
      // @ts-ignore
      const id = (data.id || uuidv4()) as string

      const docRef = doc(this.collection, "/" + id) as DocumentReference<RecordType>

      // @ts-ignore
      const recordData = { ...this.recordType.defaults, ...data, id } as RecordType
      const newRecord = this.makeEnhancedRecord(docRef, recordData)
      this.records.set(id, newRecord)

      const createData = { ...recordData }
      // @ts-ignore
      delete createData.local
      // @ts-ignore
      delete createData.localNonObserved

      const createPromise = createRecord(docRef, createData, this.collection)

      if (wait) {
         return new Promise((resolve) => createPromise.then(() => resolve(newRecord)))
      } else {
         return newRecord
      }
   }
}

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item: any) {
   return item && typeof item === "object" && !Array.isArray(item)
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target: any, ...sources: any) {
   if (!sources.length) return target
   const source = sources.shift()

   if (isObject(target) && isObject(source)) {
      for (const key in source) {
         if (isObject(source[key])) {
            if (!target[key]) Object.assign(target, { [key]: {} })
            mergeDeep(target[key], source[key])
         } else {
            Object.assign(target, { [key]: source[key] })
         }
      }
   }

   mergeDeep(target, ...sources)
}

type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B
type WritableKeysOf<T> = {
   [P in keyof T]: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P, never>
}[keyof T]
type WritablePart<T> = Pick<T, WritableKeysOf<T>>
type FunctionPropertyNames<T> = {
   [K in keyof T]: T[K] extends Function ? K : never
}[keyof T]
