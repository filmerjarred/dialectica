import admin from "firebase-admin"
import { HandlerEvent } from "@netlify/functions"

export const isDev = process.env.NODE_ENV !== "production"

admin.initializeApp(
   {
      credential: admin.credential.cert({
         projectId: "dialectica-e470f",
         privateKey: Buffer.from(process.env.FIREBASE_KEY, "base64").toString("ascii"),
         clientEmail: "firebase-adminsdk-sjgs8@dialectica-e470f.iam.gserviceaccount.com",
      }),
      databaseURL: "dialectica-e470f.firestore.io",
   }
   // : {
   //      credential: admin.credential.cert({
   //         projectId: "bright-net",
   //         privateKey: Buffer.from(process.env.FIREBASE_KEY, "base64").toString("ascii"),
   //         clientEmail: "firebase-adminsdk-k5llt@bright-net.iam.gserviceaccount.com",
   //      }),
   //      databaseURL: "bright-net.firestore.io",
   //   }
)

export const isAuthenticated = async (event: HandlerEvent) => {
   const idToken = event.headers["firebase-token"]
   if (!idToken) return false

   try {
      return admin.auth().verifyIdToken(idToken)
   } catch (e) {
      return false
   }
}
