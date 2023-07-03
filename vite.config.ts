import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { URL, fileURLToPath } from "url"
import FullReload from "vite-plugin-full-reload"

// https://vitejs.dev/config/
export default defineConfig({
   build: {
      sourcemap: true, // Source map generation must be turned on
   },
   plugins: [
      react({
         include: "./src/**/*",
      }),
      FullReload(["./src/**/*"]),
      // sentryVitePlugin({
      //    org: "dialecica",
      //    project: "javascript-react",

      //    // Auth tokens can be obtained from https://sentry.io/settings/account/api/auth-tokens/
      //    // and need `project:releases` and `org:read` scopes
      //    authToken: process.env.SENTRY_AUTH_TOKEN,

      //    sourcemaps: {
      //       // Specify the directory containing build artifacts
      //       assets: "./dist/**",
      //    },

      //    // Use the following option if you're on an SDK version lower than 7.47.0:
      //    // include: "./dist",

      //    // Optionally uncomment the line below to override automatic release name detection
      //    // release: env.RELEASE,
      // }),
   ],
   server: {
      hmr: {
         overlay: false,
      },
   },
   resolve: {
      alias: {
         "react-hotkeys-hook": fileURLToPath(
            new URL("./src/external-modules/react-hotkeys-hook/index", import.meta.url)
         ),
         "react-archer": fileURLToPath(new URL("./src/external-modules/react-archer/react-archer", import.meta.url)),
         reactfire: fileURLToPath(new URL("./src/external-modules/reactfire", import.meta.url)),
      },
   },
})
