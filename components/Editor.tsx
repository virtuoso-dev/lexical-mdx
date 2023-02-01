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
  LexicalNode,
  $isParagraphNode,
  $isTextNode,
} from "lexical";
import { useEffect, useRef, useCallback } from "react";

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
import {
  HeadingNode,
  QuoteNode,
  $createQuoteNode,
  $isQuoteNode,
} from "@lexical/rich-text";
import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListNode, ListItemNode } from "@lexical/list";
import {
  ParentMdxNode,
  RootMdxNode,
  ParagraphMdxNode,
  TextMdxNode,
  UnderlineMdxNode,
  StrongMdxNode,
  EmphasisMdxNode,
  BlockquoteMdxNode,
} from "./MdxNodes";
import { toMarkdown } from "mdast-util-to-markdown";

const initialMarkdown = `
Hello 

World Some **nested *formatting* text some more <u>un *derl* ine</u>**.

And *some italic with nested **bold** text*.

> Quote with **bold** and *italic* text.
> and some more.

And some paragraph.
`;

const loadContent = () => {
  const tree = fromMarkdown(initialMarkdown, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  });

  console.log(tree);

  const parentMap = new WeakMap<Object, ElementNode | TextNode>();
  const formattingMap = new WeakMap<Object, number>();
  const root = $getRoot();
  parentMap.set(tree, root);

  visit(tree, (node, _index, parent) => {
    let lexicalNode: ElementNode | TextNode;
    const lexicalParent = parentMap.get(parent!)!;
    if (node.type === "root") {
      return;
    } else if (node.type === "paragraph") {
      // if lexical parent is a blockquote, skip paragraphs.
      // Otherwise, the user will get stuck when hitting enter in the blockquote.
      if ($isQuoteNode(lexicalParent)) {
        parentMap.set(node, lexicalParent);
      } else {
        lexicalNode = $createParagraphNode();
        parentMap.set(node, lexicalNode);
        lexicalParent.append(lexicalNode);
      }
    } else if (node.type === "blockquote") {
      lexicalNode = $createQuoteNode();
      parentMap.set(node, lexicalNode);
      lexicalParent.append(lexicalNode);
    } else if (node.type === "text") {
      lexicalNode = $createTextNode(node.value);
      lexicalNode.setFormat(formattingMap.get(parent!)!);
      lexicalParent.append(lexicalNode);
    } else if (node.type === "emphasis") {
      formattingMap.set(node, IS_ITALIC | (formattingMap.get(parent!) ?? 0));
      parentMap.set(node, lexicalParent);
    } else if (node.type === "strong") {
      formattingMap.set(node, IS_BOLD | (formattingMap.get(parent!) ?? 0));
      parentMap.set(node, lexicalParent);
    } else if (node.type === "mdxJsxTextElement" && node.name === "u") {
      formattingMap.set(node, IS_UNDERLINE | (formattingMap.get(parent!) ?? 0));
      parentMap.set(node, lexicalParent);
    } else {
      throw new Error(`Unknown node type ${node.type}`);
    }
  });
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

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error: Error) {
  console.error(error);
}

function convertLexicalStateToMarkdown(state: EditorState) {
  const rootMdxNode = new RootMdxNode();
  function visitNode(
    parentMdxNode: ParentMdxNode<any>,
    lexicalChildren: Array<LexicalNode>
  ) {
    lexicalChildren.forEach((lexicalChild) => {
      if ($isParagraphNode(lexicalChild)) {
        visitNode(
          parentMdxNode.append(new ParagraphMdxNode()),
          lexicalChild.getChildren()
        );
      } else if ($isQuoteNode(lexicalChild)) {
        visitNode(
          parentMdxNode.append(new BlockquoteMdxNode()),
          lexicalChild.getChildren()
        );
      } else if ($isTextNode(lexicalChild)) {
        const previousSibling = lexicalChild.getPreviousSibling();

        const prevFormat = previousSibling?.getFormat?.() ?? 0;
        const format = lexicalChild.getFormat() ?? 0;

        let localParentMdxNode = parentMdxNode;

        if (prevFormat & format & IS_ITALIC) {
          localParentMdxNode = localParentMdxNode.append(new EmphasisMdxNode());
        }

        if (prevFormat & format & IS_BOLD) {
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

        localParentMdxNode.append(
          new TextMdxNode(lexicalChild.getTextContent())
        );
      } else {
        console.warn(`Unknown node type ${lexicalChild.type}`, lexicalChild);
      }
    });
  }

  return new Promise<string>((resolve) => {
    state.read(() => {
      visitNode(rootMdxNode, $getRoot().getChildren());
      console.log(rootMdxNode.toTree());

      const resultMarkdown = toMarkdown(rootMdxNode.toTree(), {
        extensions: [mdxToMarkdown()],
      });
      resolve(resultMarkdown);
    });
  });
}

function MarkdownResult() {
  const [editor] = useLexicalComposerContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    convertLexicalStateToMarkdown(editor.getEditorState()).then((markdown) => {
      textareaRef.current!.value = markdown;
    });
  });

  const onChange = useCallback(() => {
    convertLexicalStateToMarkdown(editor.getEditorState()).then((markdown) => {
      textareaRef.current!.value = markdown;
    });
  }, [editor, textareaRef]);

  return (
    <>
      <h3>Initial markdown</h3>
      <code>
        <pre>{initialMarkdown}</pre>
      </code>

      <h3>Result markdown</h3>
      <OnChangePlugin onChange={onChange} />
      <textarea style={{ width: "100%" }} rows={20} ref={textareaRef} />
    </>
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
      <hr />
      <hr />
      <LexicalLinkPlugin />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      <HistoryPlugin />
      <MarkdownResult />
    </LexicalComposer>
  );
}
