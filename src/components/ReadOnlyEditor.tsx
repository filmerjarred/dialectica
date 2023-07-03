import { LexicalComposer } from "@lexical/react/LexicalComposer"
import PlaygroundEditorTheme from "../lib/editor/themes/PlaygroundEditorTheme"
import LexicalEditorComponent from "../lib/editor/LexicalEditor"
import NodeList, { getNodeList } from "../lib/editor/nodes/NodeList"

const noop = () => {}
export function ReadOnlyEditor({ text }: { text: string }) {
   const initialConfig = {
      editorState: text,
      namespace: "ReadOnlyEditor",
      editable: false,
      nodes: getNodeList("ReadOnlyEditor"),
      onError: (error: Error) => {
         throw error
      },
      theme: PlaygroundEditorTheme,
   }

   return (
      <LexicalComposer initialConfig={initialConfig}>
         <LexicalEditorComponent
            onBlur={noop}
            onClick={noop}
            onKeyDown={noop}
            onTextFocus={noop}
            onTextUpdate={noop}
         ></LexicalEditorComponent>
      </LexicalComposer>
   )
}
