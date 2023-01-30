/**
 * @typedef {import('mdast-util-mdx')}
 */
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  EditorState,
  ElementNode,
  ParagraphNode,
  TextNode,
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
import {
  $createStrongNode,
  StrongNode,
  $createEmphasisNode,
  EmphasisNode,
  $createUnderlineNode,
  UnderlineNode,
} from "./FormatNode";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import ToolbarDemo from "./Toolbar";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxjs } from "micromark-extension-mdxjs";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { visit } from "unist-util-visit";

const markdown = `
Hello 

World *italic*

  Some **nested *formatting* text some more <u>un *derl* ine</u>**.
`;

const loadContent = () => {
  const tree = fromMarkdown(markdown, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  });

  const parentMap = new WeakMap<Object, ElementNode | TextNode>();
  const root = $getRoot();
  parentMap.set(tree, root);

  console.log(tree);

  visit(tree, (node, _index, parent) => {
    let lexicalNode: ElementNode | TextNode;
    if (node.type === "root") {
      return;
    } else if (node.type === "paragraph") {
      lexicalNode = $createParagraphNode();
    } else if (node.type === "text") {
      lexicalNode = $createTextNode(node.value);
    } else if (node.type === "emphasis") {
      lexicalNode = $createEmphasisNode();
    } else if (node.type === "strong") {
      lexicalNode = $createStrongNode();
    } else if (node.type === "mdxJsxTextElement" && node.name === "u") {
      lexicalNode = $createUnderlineNode();
    } else {
      throw new Error(`Unknown node type ${node.type}`);
    }

    const lexicalParent = parentMap.get(parent!)!;
    lexicalParent.append(lexicalNode);
    parentMap.set(node, lexicalNode);
  });

  // Get the RootNode from the EditorState

  /*
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
  */

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
    nodes: [
      ParagraphNode,
      LinkNode,
      TweetNode,
      PetyoNode,
      EmphasisNode,
      StrongNode,
      UnderlineNode,
    ],
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
