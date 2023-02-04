/**
 * @typedef {import('mdast-util-mdx')}
 */
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  EditorState,
  ElementNode,
  LexicalNode,
  ParagraphNode,
  TextNode,
} from 'lexical'
import { useCallback, useEffect, useState } from 'react'

import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { LinkPlugin as LexicalLinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin'

import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import ToolbarDemo from './Toolbar'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { mdxjs } from 'micromark-extension-mdxjs'
import { mdxFromMarkdown, mdxToMarkdown } from 'mdast-util-mdx'
import { visit } from 'unist-util-visit'
import { TRANSFORMERS } from '@lexical/markdown'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode, HeadingNode, QuoteNode } from '@lexical/rich-text'
import { CodeNode } from '@lexical/code'
import { $createLinkNode, $isLinkNode, LinkNode } from '@lexical/link'
import { $createListItemNode, $createListNode, $isListItemNode, $isListNode, ListItemNode, ListNode } from '@lexical/list'
import {
  BlockquoteMdxNode,
  EmphasisMdxNode,
  HeadingMdxNode,
  InlineCodeMdxNode,
  LinkMdxNode,
  ListItemMdxNode,
  ListMdxNode,
  ParagraphMdxNode,
  ParentMdxNode,
  RootMdxNode,
  StrongMdxNode,
  TextMdxNode,
  UnderlineMdxNode,
} from './MdxNodes'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { toMarkdown } from 'mdast-util-to-markdown'
import { IS_BOLD, IS_CODE, IS_ITALIC, IS_UNDERLINE } from './FormatConstants'
import type { Node as UnistNode } from 'unist'
import { LinkUIPlugin } from './LinkUIPlugin'

const initialMarkdown = `
some \`inlineVariable\` code

[A link](https://google.com/ "Googl Title")

# Hello 

 - bullet 1 *something*
 - bullet 2, **bold** some more text
    - nested bullet
    - nested bullet 2

1. item 1
2. item 2

World Some **nested *formatting* text some more <u>un *derl* ine</u>**.

And *some italic with nested **bold** text*.

> Quote with **bold** and *italic* text.
> and some more.

## ... and now

Alt heading
-----------

And some paragraph.
`

const loadContent = () => {
  const tree = fromMarkdown(initialMarkdown, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  })

  // eslint-disable-next-line no-console
  console.log(tree)

  const parentMap = new WeakMap<UnistNode, ElementNode | TextNode>()
  const formattingMap = new WeakMap<UnistNode, number>()
  const root = $getRoot()
  parentMap.set(tree, root)

  visit(tree, (node, _index, parent) => {
    function addFormatting(format: typeof IS_BOLD | typeof IS_ITALIC | typeof IS_UNDERLINE) {
      formattingMap.set(node, format | (formattingMap.get(parent!) ?? 0))
    }

    let lexicalNode: ElementNode | TextNode
    const lexicalParent = parentMap.get(parent!)!
    if (node.type === 'root') {
      return
    } else if (node.type === 'paragraph') {
      // if lexical parent is a blockquote, skip paragraphs.
      // Otherwise, the user will get stuck when hitting enter in the blockquote.
      if ($isQuoteNode(lexicalParent) || $isListItemNode(lexicalParent)) {
        parentMap.set(node, lexicalParent)
      } else {
        lexicalNode = $createParagraphNode()
        lexicalParent.append(lexicalNode)
        parentMap.set(node, lexicalNode)
      }
    } else if (node.type === 'link') {
      lexicalNode = $createLinkNode(node.url)
      lexicalParent.append(lexicalNode)
      parentMap.set(node, lexicalNode)
    } else if (node.type === 'blockquote') {
      lexicalNode = $createQuoteNode()
      lexicalParent.append(lexicalNode)
      parentMap.set(node, lexicalNode)
    } else if (node.type === 'list') {
      lexicalNode = $createListNode(node.ordered ? 'number' : 'bullet')
      if ($isListItemNode(lexicalParent)) {
        const dedicatedParent = $createListItemNode()
        lexicalParent.insertAfter(dedicatedParent)
        dedicatedParent.append(lexicalNode)
      } else {
        lexicalParent.append(lexicalNode)
      }
      parentMap.set(node, lexicalNode)
    } else if (node.type === 'listItem') {
      lexicalNode = $createListItemNode()
      lexicalParent.append(lexicalNode)
      parentMap.set(node, lexicalNode)
    } else if (node.type === 'heading') {
      lexicalNode = $createHeadingNode(`h${node.depth}`)
      lexicalParent.append(lexicalNode)
      parentMap.set(node, lexicalNode)
    } else if (node.type === 'text') {
      lexicalNode = $createTextNode(node.value)
      lexicalNode.setFormat(formattingMap.get(parent!)!)
      lexicalParent.append(lexicalNode)
    } else if (node.type === 'emphasis') {
      addFormatting(IS_ITALIC)
      parentMap.set(node, lexicalParent)
    } else if (node.type === 'strong') {
      addFormatting(IS_BOLD)
      parentMap.set(node, lexicalParent)
    } else if (node.type === 'mdxJsxTextElement' && node.name === 'u') {
      addFormatting(IS_UNDERLINE)
      parentMap.set(node, lexicalParent)
    } else if (node.type === 'inlineCode') {
      lexicalNode = $createTextNode(node.value)
      lexicalNode.setFormat(IS_CODE)
      lexicalParent.append(lexicalNode)
    } else {
      throw new Error(`Unknown node type ${node.type}`)
    }
  })
}

const theme = {
  text: {
    bold: 'PlaygroundEditorTheme__textBold',
    code: 'PlaygroundEditorTheme__textCode',
    italic: 'PlaygroundEditorTheme__textItalic',
    strikethrough: 'PlaygroundEditorTheme__textStrikethrough',
    subscript: 'PlaygroundEditorTheme__textSubscript',
    superscript: 'PlaygroundEditorTheme__textSuperscript',
    underline: 'PlaygroundEditorTheme__textUnderline',
    underlineStrikethrough: 'PlaygroundEditorTheme__textUnderlineStrikethrough',
  },

  list: {
    nested: {
      listitem: 'PlaygroundEditorTheme__nestedListItem',
    },
  },
}

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error: Error) {
  console.error(error)
}

function convertLexicalStateToMarkdown(state: EditorState) {
  const rootMdxNode = new RootMdxNode()
  function visitNode(parentMdxNode: ParentMdxNode<any>, lexicalChildren: Array<LexicalNode>) {
    lexicalChildren.forEach((lexicalChild) => {
      if ($isParagraphNode(lexicalChild)) {
        visitNode(parentMdxNode.append(new ParagraphMdxNode()), lexicalChild.getChildren())
      } else if ($isLinkNode(lexicalChild)) {
        visitNode(parentMdxNode.append(new LinkMdxNode([], lexicalChild.getURL())), lexicalChild.getChildren())
      } else if ($isQuoteNode(lexicalChild)) {
        visitNode(parentMdxNode.append(new BlockquoteMdxNode()), lexicalChild.getChildren())
      } else if ($isListNode(lexicalChild)) {
        visitNode(parentMdxNode.append(new ListMdxNode([], lexicalChild.getListType() === 'number')), lexicalChild.getChildren())
      } else if ($isListItemNode(lexicalChild)) {
        const children = lexicalChild.getChildren()
        const firstChild = children[0]
        if (children.length === 1 && $isListNode(firstChild)) {
          // append the list ater the paragraph of the previous list item
          const prevListItemMdxNode = parentMdxNode.children.at(-1)! as ListItemMdxNode
          // TODO: invariant for having prevListItemMdxNode
          visitNode(prevListItemMdxNode, lexicalChild.getChildren())
        } else {
          const mdxNode = new ListItemMdxNode()
          const paragraphWrapper = new ParagraphMdxNode()
          mdxNode.append(paragraphWrapper)
          parentMdxNode.append(mdxNode)
          visitNode(paragraphWrapper, lexicalChild.getChildren())
        }
      } else if ($isHeadingNode(lexicalChild)) {
        const headingDepth = parseInt(lexicalChild.getTag()[1], 10) as import('mdast').Heading['depth']
        visitNode(parentMdxNode.append(new HeadingMdxNode([], headingDepth)), lexicalChild.getChildren())
      } else if ($isTextNode(lexicalChild)) {
        const previousSibling = lexicalChild.getPreviousSibling()
        const prevFormat = previousSibling?.getFormat?.() ?? 0
        const format = lexicalChild.getFormat() ?? 0

        if (format & IS_CODE) {
          parentMdxNode.append(new InlineCodeMdxNode(lexicalChild.getTextContent()))
          return
        }

        let localParentMdxNode = parentMdxNode

        if (prevFormat & format & IS_ITALIC) {
          localParentMdxNode = localParentMdxNode.append(new EmphasisMdxNode())
        }

        if (prevFormat & format & IS_BOLD) {
          localParentMdxNode = localParentMdxNode.append(new StrongMdxNode())
        }

        if (prevFormat & format & IS_UNDERLINE) {
          localParentMdxNode = localParentMdxNode.append(new UnderlineMdxNode())
        }

        if (format & IS_ITALIC && !(prevFormat & IS_ITALIC)) {
          localParentMdxNode = localParentMdxNode.append(new EmphasisMdxNode())
        }

        if (format & IS_BOLD && !(prevFormat & IS_BOLD)) {
          localParentMdxNode = localParentMdxNode.append(new StrongMdxNode())
        }

        if (format & IS_UNDERLINE && !(prevFormat & IS_UNDERLINE)) {
          localParentMdxNode = localParentMdxNode.append(new UnderlineMdxNode())
        }

        localParentMdxNode.append(new TextMdxNode(lexicalChild.getTextContent()))
      } else if ($isLineBreakNode(lexicalChild)) {
        parentMdxNode.append(new TextMdxNode('\n'))
      } else {
        console.warn(`Unknown node type ${lexicalChild.type}`, lexicalChild)
      }
    })
  }

  return new Promise<string>((resolve) => {
    state.read(() => {
      visitNode(rootMdxNode, $getRoot().getChildren())
      const resultMarkdown = toMarkdown(rootMdxNode.toTree(), {
        extensions: [mdxToMarkdown()],
        listItemIndent: 'one',
      })
      resolve(resultMarkdown)
    })
  })
}

function MarkdownResult() {
  const [editor] = useLexicalComposerContext()
  const [outMarkdown, setOutMarkdown] = useState('')
  useEffect(() => {
    convertLexicalStateToMarkdown(editor.getEditorState())
      .then((markdown) => {
        setOutMarkdown(markdown)
      })
      .catch((rejection) => console.warn({ rejection }))
  })

  const onChange = useCallback(() => {
    convertLexicalStateToMarkdown(editor.getEditorState())
      .then((markdown) => {
        setOutMarkdown(markdown)
      })
      .catch((rejection) => console.warn({ rejection }))
  }, [editor])

  return (
    <>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1 }}>
          <h3>Result markdown</h3>
          <OnChangePlugin onChange={onChange} />

          <code>
            <pre>{outMarkdown.trim()}</pre>
          </code>
        </div>
        <div style={{ flex: 1 }}>
          <h3>Initial markdown</h3>
          <code>
            <pre>{initialMarkdown.trim()}</pre>
          </code>
        </div>
      </div>
    </>
  )
}

export function Editor() {
  const initialConfig = {
    editorState: () => {
      loadContent()
    },
    namespace: 'MyEditor',
    theme,
    nodes: [ParagraphNode, LinkNode, HeadingNode, QuoteNode, CodeNode, ListNode, ListItemNode],
    onError,
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <LinkUIPlugin />
      <RichTextPlugin
        contentEditable={
          <>
            <ToolbarDemo />
            <ContentEditable className="EditorContentEditable" />
          </>
        }
        placeholder={<div></div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <hr />
      <hr />
      <LexicalLinkPlugin />
      <ListPlugin />
      <TabIndentationPlugin />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      <HistoryPlugin />
      <MarkdownResult />
    </LexicalComposer>
  )
}
