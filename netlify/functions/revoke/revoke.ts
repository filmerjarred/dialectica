import admin from "firebase-admin"
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions"
import { config } from "dotenv"
import { UserRecord } from "firebase-admin/lib/auth/user-record"

config()

admin.initializeApp({
   credential: admin.credential.cert({
      projectId: "dialectica-e470f",
      privateKey: Buffer.from(process.env.FIREBASE_KEY, "base64").toString("ascii"),
      clientEmail: "firebase-adminsdk-sjgs8@dialectica-e470f.iam.gserviceaccount.com",
   }),
   databaseURL: "dialectica-e470f.firestore.io",
})

const forAllUsers = (fn: (user: UserRecord) => void, nextPageToken?: string) => {
   admin
      .auth()
      .listUsers(100, nextPageToken)
      .then((listUsersResult) => {
         listUsersResult.users.forEach((userRecord) => {
            fn(userRecord)
         })
         if (listUsersResult.pageToken) {
            // List next batch of users.
            forAllUsers(fn, listUsersResult.pageToken)
         }
      })
      .catch((error) => {
         console.log("Error listing users:", error)
      })
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
   forAllUsers((user) => {
      admin
         .auth()
         // .revokeRefreshTokens(user.uid)
         .then(() => {
            return admin.auth().getUser(user.uid)
         })
         .then((userRecord) => {
            return new Date(userRecord.tokensValidAfterTime!).getTime() / 1000
         })
         .then((timestamp) => {
            console.log(`${user.email} token revoked at: ${timestamp}`)
         })
   })

   return {
      statusCode: 200,
   }
}
