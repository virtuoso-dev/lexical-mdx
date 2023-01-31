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
  SerializedLexicalNode,
  SerializedParagraphNode,
  SerializedTextNode,
} from "lexical";
import { useEffect } from "react";

const IS_BOLD = 1;
const IS_ITALIC = 1 << 1;
// const IS_STRIKETHROUGH = 1 << 2;
const IS_UNDERLINE = 1 << 3;

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { LinkPlugin as LexicalLinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
// import { TweetNode, $createTweetNode } from "./TweetNode";
// import { $createPetyoNode, PetyoNode } from "./PetyoNode";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import ToolbarDemo from "./Toolbar";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxjs } from "micromark-extension-mdxjs";
import { mdxFromMarkdown, mdxToMarkdown } from "mdast-util-mdx";
import { visit } from "unist-util-visit";
import { TRANSFORMERS } from "@lexical/markdown";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { CodeNode } from "@lexical/code";
import { $createLinkNode, LinkNode } from "@lexical/link";
import { ListNode, ListItemNode } from "@lexical/list";
import {
  ParentMdxNode,
  ParentNode,
  RootMdxNode,
  ParagraphMdxNode,
  TextMdxNode,
  UnderlineMdxNode,
  StrongMdxNode,
  EmphasisMdxNode,
} from "./MdxNodes";
import { toMarkdown } from "mdast-util-to-markdown";

const markdown = `
Hello 

World Some **nested *formatting* text some more <u>un *derl* ine</u>**.

And *some italic with nested **bold** text*.
`;

const loadContent = () => {
  const tree = fromMarkdown(markdown, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  });

  const parentMap = new WeakMap<Object, ElementNode | TextNode>();
  const formattingMap = new WeakMap<Object, number>();
  const root = $getRoot();
  parentMap.set(tree, root);
  console.log(tree);

  visit(tree, (node, _index, parent) => {
    let lexicalNode: ElementNode | TextNode;
    if (node.type === "root") {
      return;
    } else if (node.type === "paragraph") {
      lexicalNode = $createParagraphNode();
      parentMap.set(node, lexicalNode);
      const lexicalParent = parentMap.get(parent!)!;
      lexicalParent.append(lexicalNode);
    } else if (node.type === "text") {
      lexicalNode = $createTextNode(node.value);
      const lexicalParent = parentMap.get(parent!)!;
      lexicalNode.setFormat(formattingMap.get(parent!)!);
      lexicalParent.append(lexicalNode);
    } else if (node.type === "emphasis") {
      formattingMap.set(node, IS_ITALIC | (formattingMap.get(parent!) ?? 0));
      parentMap.set(node, parentMap.get(parent!)!);
    } else if (node.type === "strong") {
      formattingMap.set(node, IS_BOLD | (formattingMap.get(parent!) ?? 0));
      parentMap.set(node, parentMap.get(parent!)!);
    } else if (node.type === "mdxJsxTextElement" && node.name === "u") {
      formattingMap.set(node, IS_UNDERLINE | (formattingMap.get(parent!) ?? 0));
      parentMap.set(node, parentMap.get(parent!)!);
    } else {
      throw new Error(`Unknown node type ${node.type}`);
    }
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
    console.log($getRoot().exportJSON());
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

function isLexicalSerializedTextNode(
  node: SerializedLexicalNode
): node is SerializedTextNode {
  return node.type === "text";
}

function convertLexicalStateToMarkdown(state: EditorState) {
  const rootMdxNode = new RootMdxNode();
  function visitNode(
    parentMdxNode: ParentMdxNode<any>,
    lexicalChildren: Array<SerializedLexicalNode>
  ) {
    lexicalChildren.forEach((lexicalChild, index) => {
      if (lexicalChild.type === "paragraph") {
        visitNode(
          parentMdxNode.append(new ParagraphMdxNode()),
          (lexicalChild as SerializedParagraphNode).children
        );
      } else if (isLexicalSerializedTextNode(lexicalChild)) {
        const previousSibling = lexicalChildren[index - 1];

        //@ts-ignore
        const prevFormat = previousSibling?.format ?? 0;
        const format = lexicalChild.format ?? 0;

        let localParentMdxNode = parentMdxNode;

        if (prevFormat & format & IS_ITALIC) {
          localParentMdxNode = localParentMdxNode.append(new EmphasisMdxNode());
        }

        if (prevFormat & format & IS_BOLD) {
          console.log("continue bold");
          localParentMdxNode = localParentMdxNode.append(new StrongMdxNode());
        }

        if (prevFormat & format & IS_UNDERLINE) {
          localParentMdxNode = localParentMdxNode.append(
            new UnderlineMdxNode()
          );
        }

        if (format & IS_ITALIC && !(prevFormat & IS_ITALIC)) {
          localParentMdxNode = localParentMdxNode.append(new EmphasisMdxNode());
        }

        if (format & IS_BOLD && !(prevFormat & IS_BOLD)) {
          localParentMdxNode = localParentMdxNode.append(new StrongMdxNode());
        }

        if (format & IS_UNDERLINE && !(prevFormat & IS_UNDERLINE)) {
          localParentMdxNode = localParentMdxNode.append(
            new UnderlineMdxNode()
          );
        }

        localParentMdxNode.append(new TextMdxNode(lexicalChild.text));
      } else {
        throw new Error(`Unknown node type ${lexicalChild.type}`);
      }
    });
  }

  visitNode(rootMdxNode, state.toJSON().root.children);

  const resultMarkdown = toMarkdown(rootMdxNode.toTree(), {
    extensions: [mdxToMarkdown()],
  });
  console.log(resultMarkdown);
  console.log(markdown);
}

function LogStateButton() {
  const [editor] = useLexicalComposerContext();
  return (
    <button
      onClick={() => {
        convertLexicalStateToMarkdown(editor.getEditorState());
        // console.log(editor.getEditorState().toJSON());

        /*
        editor.getEditorState().read(() => {
          const root = $getRoot();
          console.log(root);
          console.log(root.getTextContent());
          console.log(root.exportJSON());
        });
        */
      }}
    >
      Log State
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
      HeadingNode,
      QuoteNode,
      CodeNode,
      ListNode,
      ListItemNode,
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
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      <OnChangePlugin onChange={onChange} />
      <HistoryPlugin />
      <LogStateButton />
    </LexicalComposer>
  );
}
