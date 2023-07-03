export type Resolvable = ReturnType<typeof createResolvable>

export function createResolvable() {
   let _resolve: (...args: any[]) => any
   let _reject: (...args: any[]) => any
   const promise = new Promise((resolve, reject) => {
      _resolve = resolve
      _reject = reject
   })
   // @ts-ignore
   return { resolve: _resolve, reject: _reject, promise }
}
