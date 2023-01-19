import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  EditorState,
  ParagraphNode,
} from "lexical";
import { useEffect } from "react";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { LinkPlugin as LexicalLinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { $createLinkNode, LinkNode } from "@lexical/link";
import { TweetNode, $createTweetNode } from "./TweetNode";
import { $createPetyoNode, PetyoNode } from "./PetyoNode";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import ToolbarDemo from "./Toolbar";

// Get editor initial state (e.g. loaded from backend)
const loadContent = () => {
  // Get the RootNode from the EditorState
  const root = $getRoot();

  // Get the selection from the EditorState
  const selection = $getSelection();

  // Create a new ParagraphNode
  let paragraphNode = $createParagraphNode();
  let textNode = $createTextNode("Hello world ");
  let linkNode = $createLinkNode("https://lexical.dev");
  linkNode.append($createTextNode("A link to lexical"));
  paragraphNode.append(textNode, linkNode);
  paragraphNode.append(
    $createLineBreakNode(),
    $createTextNode("different").toggleFormat("underline")
  );
  root.append(paragraphNode);

  paragraphNode = $createParagraphNode();
  textNode = $createTextNode("Second line");
  paragraphNode.append(textNode);
  root.append(paragraphNode);

  // const tweetNode = $createTweetNode("1613060550790889475");
  // root.append(tweetNode);
  // root.append($createPetyoNode());
};

const theme = {
  text: {
    bold: "PlaygroundEditorTheme__textBold",
    code: "PlaygroundEditorTheme__textCode",
    italic: "PlaygroundEditorTheme__textItalic",
    strikethrough: "PlaygroundEditorTheme__textStrikethrough",
    subscript: "PlaygroundEditorTheme__textSubscript",
    superscript: "PlaygroundEditorTheme__textSuperscript",
    underline: "PlaygroundEditorTheme__textUnderline",
    underlineStrikethrough: "PlaygroundEditorTheme__textUnderlineStrikethrough",
  },
};

// When the editor changes, you can get notified via the
// LexicalOnChangePlugin!
function onChange(editorState: EditorState) {
  editorState.read(() => {
    // Read the contents of the EditorState here.
    const root = $getRoot();
    const selection = $getSelection();
    console.log(root.getTextContent());
  });
}

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error: Error) {
  console.error(error);
}

function LogStateButton() {
  const [editor] = useLexicalComposerContext();
  return (
    <button
      onClick={() => {
        editor.update(() => {
          const root = $getRoot();
          console.log($getRoot().exportJSON());
        });
      }}
    >
      Click here
    </button>
  );
}

export function Editor() {
  const initialConfig = {
    editorState: () => {
      loadContent();
    },
    namespace: "MyEditor",
    theme,
    nodes: [ParagraphNode, LinkNode, TweetNode, PetyoNode],
    onError,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={
          <>
            <ToolbarDemo />
            <ContentEditable />
          </>
        }
        placeholder={<div></div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <LexicalLinkPlugin />
      <OnChangePlugin onChange={onChange} />
      <HistoryPlugin />
      <LogStateButton />
    </LexicalComposer>
  );
}
