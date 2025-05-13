import { initializeApp, setLogLevel } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { isDev } from "./isDev"
import { getAnalytics } from "firebase/analytics";

export const firebaseConfig = isDev
   ? {
        //   apiKey: "AIzaSyC95QmENRztrxf4l6C4Dnn-dr3lrIGIUM8",
        //   authDomain: "realtime-git.firebaseapp.com",
        //   databaseURL: "https://realtime-git.firebaseio.com",
        //   projectId: "realtime-git",
        //   storageBucket: "realtime-git.appspot.com",
        //   messagingSenderId: "430870721658",
        //   appId: "1:430870721658:web:7ed30513d023033f2a37c3",

        //   apiKey: "AIzaSyBmqhZCmKn_DcCN_4l11NyxHQ3aih7UPf0",
        //   authDomain: "test-dc716.firebaseapp.com",
        //   projectId: "test-dc716",
        //   storageBucket: "test-dc716.appspot.com",
        //   messagingSenderId: "508553501211",
        //   appId: "1:508553501211:web:331c64f050380cc2f136be",

        apiKey: "AIzaSyAsOEUY-FdsyUwl4-FqmjgLb4L4n9J7Pas",
        authDomain: "bright-net.firebaseapp.com",
        databaseURL: "https://bright-net.firebaseio.com",
        projectId: "bright-net",
        storageBucket: "bright-net.appspot.com",
        messagingSenderId: "377046621263",
        appId: "1:377046621263:web:3dca1ef44765e416f41e3a",
     }
   : {
        apiKey: "AIzaSyBjAX6Yo29AV0wXfDttC62PRqlX-teejMY",
        authDomain: "dialectica-e470f.firebaseapp.com",
        projectId: "dialectica-e470f",
        storageBucket: "dialectica-e470f.appspot.com",
        messagingSenderId: "540440119721",
        appId: "1:540440119721:web:7a5698ca3d8181d070dcb8",
     }

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
const analytics = getAnalytics(app);

// setLogLevel("debug")
