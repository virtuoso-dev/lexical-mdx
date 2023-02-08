import {
  $isRootNode,
  $isParagraphNode,
  LexicalNode,
  RootNode as LexicalRootNode,
  ElementNode as LexicalElementNode,
  $createParagraphNode,
  $createTextNode,
  $isTextNode,
  TextNode,
  ParagraphNode,
} from 'lexical'
import type { Node as UnistNode, Parent as UnistParent } from 'unist'
import * as Mdast from 'mdast'
import { toMarkdown } from 'mdast-util-to-markdown'
import { mdxFromMarkdown, MdxJsxTextElement, mdxToMarkdown } from 'mdast-util-mdx'
import { mdxjs } from 'micromark-extension-mdxjs'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { visit } from 'unist-util-visit'
import { IS_BOLD, IS_CODE, IS_ITALIC, IS_UNDERLINE } from './FormatConstants'
import { $createLinkNode, $isLinkNode, LinkNode } from '@lexical/link'
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode, HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $createListItemNode, $createListNode, $isListItemNode, $isListNode, ListItemNode, ListNode } from '@lexical/list'
import { $createCodeNode, $isCodeNode, CodeNode } from '@lexical/code'
import { HorizontalRuleNode, $createHorizontalRuleNode, $isHorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { $createImageNode, $isImageNode, ImageNode } from './ImageNode'

interface LexicalVisitActions<LN extends LexicalNode, N extends UnistNode, P extends UnistNode | null> {
  appendToParent<T extends UnistNode>(parentNode: P, node: T): T
  traverseLexicalChildren(lexicalNode: LN, parentUnistNode: N): void
}

interface UnistVisitActions {
  setCurrentUnistNodeAsParentTo(lexicalNode: LexicalNode): void
  addFormatting(format: typeof IS_BOLD | typeof IS_ITALIC | typeof IS_UNDERLINE): void
  getParentFormatting(): number
}

interface MarkdownImportExportVisitor<LN extends LexicalNode, UN extends UnistNode, ParentNode extends UnistNode | null> {
  testUnistNode: ((unistNode: UnistNode) => boolean) | string
  testLexicalNode?(lexicalNode: LexicalNode): lexicalNode is LN

  visitUnistNode(unistNode: UN, parentLexicalNode: LexicalNode, actions: UnistVisitActions): void
  visitLexicalNode?(lexicalNode: LN, parentNode: ParentNode, actions: LexicalVisitActions<LN, UN, ParentNode>): void

  shouldJoin?(prevNode: UnistNode, currentNode: UN): boolean
  join?(prevNode: UN, currentNode: UN): UN
}

const RootVisitor: MarkdownImportExportVisitor<LexicalRootNode, Mdast.Root, null> = {
  testUnistNode: 'root',
  visitUnistNode(_, parentLexicalNode, actions) {
    actions.setCurrentUnistNodeAsParentTo(parentLexicalNode)
  },

  testLexicalNode: $isRootNode,
  visitLexicalNode: (lexicalNode, _, actions) => {
    const root = actions.appendToParent(null, {
      type: 'root' as const,
      children: [],
    })
    actions.traverseLexicalChildren(lexicalNode, root)
  },
}

const ParagraphVisitor: MarkdownImportExportVisitor<ParagraphNode, Mdast.Paragraph, UnistParent> = {
  testUnistNode: 'paragraph',
  visitUnistNode: function (_, parentLexicalNode, actions): void {
    // markdown inserts paragraphs in lists. lexical does not.
    if ($isListItemNode(parentLexicalNode) || $isQuoteNode(parentLexicalNode)) {
      actions.setCurrentUnistNodeAsParentTo(parentLexicalNode)
    } else {
      const lexicalNode = $createParagraphNode()
      parentLexicalNode.append(lexicalNode)
      actions.setCurrentUnistNodeAsParentTo(lexicalNode)
    }
  },

  testLexicalNode: $isParagraphNode,
  visitLexicalNode: (lexicalNode, parentNode, actions) => {
    const paragraph = actions.appendToParent(parentNode, {
      type: 'paragraph' as const,
      children: [],
    })
    actions.traverseLexicalChildren(lexicalNode, paragraph)
  },
}

const LinkVisitor: MarkdownImportExportVisitor<LinkNode, Mdast.Link, UnistParent> = {
  testUnistNode: 'link',
  visitUnistNode: function (node, parentLexicalNode, actions): void {
    const lexicalNode = $createLinkNode(node.url)
    parentLexicalNode.append(lexicalNode)
    actions.setCurrentUnistNodeAsParentTo(lexicalNode)
  },

  testLexicalNode: $isLinkNode,
  visitLexicalNode: (lexicalNode, parentNode, actions) => {
    const link = actions.appendToParent(parentNode, {
      type: 'link' as const,
      url: lexicalNode.getURL(),
      children: [],
    })
    actions.traverseLexicalChildren(lexicalNode, link)
  },
}

const HeadingVisitor: MarkdownImportExportVisitor<HeadingNode, Mdast.Heading, UnistParent> = {
  testUnistNode: 'heading',
  visitUnistNode: function (node, parentLexicalNode, actions): void {
    const lexicalNode = $createHeadingNode(`h${node.depth}`)
    parentLexicalNode.append(lexicalNode)
    actions.setCurrentUnistNodeAsParentTo(lexicalNode)
  },

  testLexicalNode: $isHeadingNode,
  visitLexicalNode: (lexicalNode, parentNode, actions) => {
    const heading = actions.appendToParent(parentNode, {
      type: 'heading' as const,
      depth: parseInt(lexicalNode.getTag()[1], 10) as Mdast.Heading['depth'],
      children: [],
    })
    actions.traverseLexicalChildren(lexicalNode, heading)
  },
}

const ListVisitor: MarkdownImportExportVisitor<ListNode, Mdast.List, UnistParent> = {
  testUnistNode: 'list',
  visitUnistNode: function (node, parentLexicalNode, actions): void {
    const lexicalNode = $createListNode(node.ordered ? 'number' : 'bullet')

    if ($isListItemNode(parentLexicalNode)) {
      const dedicatedParent = $createListItemNode()
      dedicatedParent.append(lexicalNode)
      parentLexicalNode.insertAfter(dedicatedParent)
    } else {
      parentLexicalNode.append(lexicalNode)
    }
    actions.setCurrentUnistNodeAsParentTo(lexicalNode)
  },

  testLexicalNode: $isListNode,
  visitLexicalNode: (lexicalNode, parentNode, actions) => {
    const list = actions.appendToParent(parentNode, {
      type: 'list' as const,
      ordered: lexicalNode.getListType() === 'number',
      //TODO: figure out when spread can be true
      spread: false,
      children: [],
    })
    actions.traverseLexicalChildren(lexicalNode, list)
  },
}

// use Parent interface since we construct a list item to a paragraph :)
const ListItemVisitor: MarkdownImportExportVisitor<ListItemNode, Mdast.Parent, UnistParent> = {
  testUnistNode: 'listItem',
  visitUnistNode: function (node, parentLexicalNode, actions): void {
    const lexicalNode = $createListItemNode()
    parentLexicalNode.append(lexicalNode)
    actions.setCurrentUnistNodeAsParentTo(lexicalNode)
  },

  testLexicalNode: $isListItemNode,
  visitLexicalNode: (lexicalNode, parentNode, actions) => {
    const children = lexicalNode.getChildren()
    const firstChild = children[0]

    if (children.length === 1 && $isListNode(firstChild)) {
      // append the list ater the paragraph of the previous list item
      const prevListItemNode = parentNode.children.at(-1) as Mdast.ListItem
      actions.traverseLexicalChildren(lexicalNode, prevListItemNode)
    } else {
      const listItem = actions.appendToParent(parentNode, {
        type: 'listItem' as const,
        spread: false,
        children: [{ type: 'paragraph' as const, children: [] }],
      })
      actions.traverseLexicalChildren(lexicalNode, listItem.children[0])
    }
  },
}

const BlockQuoteVisitor: MarkdownImportExportVisitor<QuoteNode, Mdast.Parent, UnistParent> = {
  testUnistNode: 'blockquote',
  visitUnistNode: (node, parentLexicalNode, actions) => {
    const lexicalNode = $createQuoteNode()
    parentLexicalNode.append(lexicalNode)
    actions.setCurrentUnistNodeAsParentTo(lexicalNode)
  },

  testLexicalNode: $isQuoteNode,
  visitLexicalNode: (lexicalNode, parentNode, actions) => {
    const blockquote = actions.appendToParent(parentNode, {
      type: 'blockquote' as const,
      children: [{ type: 'paragraph' as const, children: [] }],
    })
    actions.traverseLexicalChildren(lexicalNode, blockquote.children[0])
  },
}

const FormattingVisitor: MarkdownImportExportVisitor<
  LexicalElementNode,
  Mdast.Paragraph | Mdast.Emphasis | Mdast.Strong | MdxJsxTextElement,
  UnistParent
> = {
  testUnistNode(unistNode: UnistNode) {
    return (
      unistNode.type === 'emphasis' ||
      unistNode.type === 'strong' ||
      (unistNode.type === 'mdxJsxTextElement' && (unistNode as MdxJsxTextElement).name === 'u')
    )
  },
  visitUnistNode: function (unistNode, parentLexicalNode, actions): void {
    if (unistNode.type === 'emphasis') {
      actions.addFormatting(IS_ITALIC)
    } else if (unistNode.type === 'strong') {
      actions.addFormatting(IS_BOLD)
    } else if (unistNode.type === 'mdxJsxTextElement' && unistNode.name === 'u') {
      actions.addFormatting(IS_UNDERLINE)
    }
    actions.setCurrentUnistNodeAsParentTo(parentLexicalNode)
  },
}

const InlineCodeVisitor: MarkdownImportExportVisitor<LexicalElementNode, Mdast.InlineCode, UnistParent> = {
  testUnistNode: 'inlineCode',
  visitUnistNode: function (unistNode, parentLexicalNode, actions): void {
    const lexicalNode = $createTextNode(unistNode.value)
    lexicalNode.setFormat(IS_CODE)
    parentLexicalNode.append(lexicalNode)
  },
}

const CodeVisitor: MarkdownImportExportVisitor<CodeNode, Mdast.Code, UnistParent> = {
  testUnistNode: 'code',
  visitUnistNode: function (unistNode, parentLexicalNode, actions): void {
    const lexicalNode = $createCodeNode(unistNode.lang)
    lexicalNode.append($createTextNode(unistNode.value))
    parentLexicalNode.append(lexicalNode)
  },
  testLexicalNode: $isCodeNode,
  visitLexicalNode: (lexicalNode, parentNode, actions) => {
    actions.appendToParent(parentNode, {
      type: 'code' as const,
      lang: lexicalNode.getLanguage(),
      value: lexicalNode.getTextContent(),
    })
  },
}

const TextVisitor: MarkdownImportExportVisitor<TextNode, Mdast.Text, UnistParent> = {
  testLexicalNode: $isTextNode,
  visitLexicalNode: (lexicalNode, parentNode, actions) => {
    const previousSibling = lexicalNode.getPreviousSibling()
    const prevFormat = previousSibling?.getFormat?.() ?? 0
    const format = lexicalNode.getFormat() ?? 0

    if (format & IS_CODE) {
      actions.appendToParent(parentNode, {
        type: 'inlineCode' as const,
        value: lexicalNode.getTextContent(),
      })
      return
    }

    let localParentNode = parentNode

    if (prevFormat & format & IS_ITALIC) {
      localParentNode = actions.appendToParent(localParentNode, { type: 'emphasis', children: [] })
    }
    if (prevFormat & format & IS_BOLD) {
      localParentNode = actions.appendToParent(localParentNode, { type: 'strong', children: [] })
    }

    if (prevFormat & format & IS_UNDERLINE) {
      localParentNode = actions.appendToParent(localParentNode, { type: 'mdxJsxTextElement', name: 'u', children: [] })
    }

    if (format & IS_ITALIC && !(prevFormat & IS_ITALIC)) {
      localParentNode = actions.appendToParent(localParentNode, { type: 'emphasis', children: [] })
    }

    if (format & IS_BOLD && !(prevFormat & IS_BOLD)) {
      localParentNode = actions.appendToParent(localParentNode, { type: 'strong', children: [] })
    }

    if (format & IS_UNDERLINE && !(prevFormat & IS_UNDERLINE)) {
      localParentNode = actions.appendToParent(localParentNode, { type: 'mdxJsxTextElement', name: 'u', children: [] })
    }

    actions.appendToParent(localParentNode, {
      type: 'text',
      value: lexicalNode.getTextContent(),
    })
  },
  testUnistNode: 'text',
  visitUnistNode: function (unistNode, parentLexicalNode, actions): void {
    const lexicalNode = $createTextNode(unistNode.value)
    lexicalNode.setFormat(actions.getParentFormatting())
    parentLexicalNode.append(lexicalNode)
  },

  shouldJoin: (prevNode, currentNode) => {
    return ['text', 'emphasis', 'strong', 'mdxJsxTextElement'].includes(prevNode.type) && prevNode.type === currentNode.type
  },

  join: (prevNode, currentNode) => {
    if (prevNode.type === 'text') {
      return { type: 'text', value: prevNode.value + currentNode.value }
    } else {
      return {
        ...prevNode,
        children: [...(prevNode as unknown as Mdast.Parent).children, ...(currentNode as unknown as Mdast.Parent).children],
      }
    }
  },
}

const ThematicBreakVisitor: MarkdownImportExportVisitor<HorizontalRuleNode, Mdast.ThematicBreak, UnistParent> = {
  testUnistNode: 'thematicBreak',
  visitUnistNode: (unistNode, parentLexicalNode, actions) => {
    parentLexicalNode.append($createHorizontalRuleNode())
  },

  testLexicalNode: $isHorizontalRuleNode,
  visitLexicalNode: (lexicalNode, parentNode, actions) => {
    actions.appendToParent(parentNode, {
      type: 'thematicBreak',
    })
  },
}

const ImageVisitor: MarkdownImportExportVisitor<ImageNode, Mdast.Image, UnistParent> = {
  testUnistNode: 'image',
  visitUnistNode: (unistNode, parentLexicalNode, actions) => {
    parentLexicalNode.append($createImageNode({ src: unistNode.url, altText: unistNode.alt || '', title: unistNode.title || '' }))
  },
  testLexicalNode: $isImageNode,
  visitLexicalNode: (lexicalNode, parentNode, actions) => {
    actions.appendToParent(parentNode, {
      type: 'image',
      url: lexicalNode.getSrc(),
      alt: lexicalNode.getAltText(),
      title: lexicalNode.getTitle(),
    })
  },
}

export const VISITORS = [
  RootVisitor,
  ParagraphVisitor,
  TextVisitor,
  FormattingVisitor,
  InlineCodeVisitor,
  LinkVisitor,
  HeadingVisitor,
  ListVisitor,
  ListItemVisitor,
  BlockQuoteVisitor,
  CodeVisitor,
  ThematicBreakVisitor,
  ImageVisitor,
]

export type Visitors = Array<MarkdownImportExportVisitor<LexicalNode, UnistNode, UnistNode | null>>

function isParent(node: UnistNode): node is UnistParent {
  return (node as any).children instanceof Array
}

export function traverseLexicalTree(root: LexicalRootNode, visitors: Visitors): Mdast.Root {
  let unistRoot: Mdast.Root | null = null
  visit(root, null)

  function appendToParent<T extends UnistNode>(parentNode: UnistNode, node: T): T {
    if (unistRoot === null) {
      unistRoot = node as unknown as Mdast.Root
      return unistRoot as unknown as T
    }

    if (!isParent(parentNode)) {
      throw new Error('Attempting to append children to a non-parent')
    }

    const siblings = parentNode.children
    const prevSibling = siblings.at(-1)

    if (prevSibling) {
      const joinVisitor = visitors.find((visitor) => visitor.shouldJoin?.(prevSibling, node))
      if (joinVisitor) {
        const joinedNode = joinVisitor.join!(prevSibling, node)
        siblings.splice(siblings.length - 1, 1, joinedNode)
        return joinedNode as T
      }
    }

    siblings.push(node)
    return node
  }

  function traverseLexicalChildren(lexicalNode: LexicalElementNode, parentNode: UnistParent) {
    lexicalNode.getChildren().forEach((lexicalChild) => {
      visit(lexicalChild, parentNode)
    })
  }

  function visit(lexicalNode: LexicalNode, parentNode: UnistParent | null) {
    const visitor = visitors.find((visitor) => visitor.testLexicalNode?.(lexicalNode))
    if (!visitor) {
      throw new Error(`no lexical visitor found for ${lexicalNode.getType()}`, { cause: lexicalNode })
    }

    visitor.visitLexicalNode?.(lexicalNode, parentNode, {
      appendToParent,
      traverseLexicalChildren,
    })
  }

  if (unistRoot === null) {
    throw new Error('traversal ended with no root element')
  }
  return unistRoot
}

export function importMarkdownToLexical(root: LexicalRootNode, markdown: string, visitors: Visitors = VISITORS): void {
  const parentMap = new WeakMap<UnistNode, LexicalNode>()
  const formattingMap = new WeakMap<UnistNode, number>()

  const tree = fromMarkdown(markdown, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  })

  visit(tree, (node, _index, parent) => {
    const visitor = visitors.find((visitor) => {
      if (typeof visitor.testUnistNode === 'string') {
        return visitor.testUnistNode === node.type
      }
      return visitor.testUnistNode(node)
    })
    if (!visitor) {
      throw new Error(`no unist visitor found for ${node.type}`, { cause: node })
    }

    const lexicalParent = parent ? parentMap.get(parent)! : root
    visitor.visitUnistNode(node, lexicalParent, {
      setCurrentUnistNodeAsParentTo(lexicalNode) {
        parentMap.set(node, lexicalNode)
      },
      addFormatting(format) {
        formattingMap.set(node, format | (formattingMap.get(parent!) ?? 0))
      },
      getParentFormatting() {
        return formattingMap.get(parent!) ?? 0
      },
    })
  })
}

export function generateMarkdownFromAst(node: Mdast.Root): string {
  return toMarkdown(node, {
    extensions: [mdxToMarkdown()],
    listItemIndent: 'one',
  })
}

export function exportMarkdownFromLexical(root: LexicalRootNode, visitors: Visitors = VISITORS): string {
  return generateMarkdownFromAst(traverseLexicalTree(root, visitors))
}
