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
import { $createHeadingNode, $isHeadingNode, HeadingNode } from '@lexical/rich-text'

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
  testLexicalNode?(lexicalNode: LexicalNode): lexicalNode is LN
  visitLexicalNode?(lexicalNode: LN, parentNode: ParentNode, actions: LexicalVisitActions<LN, UN, ParentNode>): void
  shouldJoin?(prevNode: UnistNode, currentNode: UN): boolean
  join?(prevNode: UN, currentNode: UN): UN
  testUnistNode: ((unistNode: UnistNode) => boolean) | string
  visitUnistNode(unistNode: UN, parentLexicalNode: LexicalNode, actions: UnistVisitActions): void
}

const RootVisitor: MarkdownImportExportVisitor<LexicalRootNode, Mdast.Root, null> = {
  testLexicalNode: $isRootNode,
  visitLexicalNode: (lexicalNode, _, actions) => {
    const root = actions.appendToParent(null, {
      type: 'root' as const,
      children: [],
    })
    actions.traverseLexicalChildren(lexicalNode, root)
  },
  testUnistNode: 'root',
  visitUnistNode(_, parentLexicalNode, actions) {
    actions.setCurrentUnistNodeAsParentTo(parentLexicalNode)
  },
}

const ParagraphVisitor: MarkdownImportExportVisitor<ParagraphNode, Mdast.Paragraph, UnistParent> = {
  testLexicalNode: $isParagraphNode,
  visitLexicalNode: (lexicalNode, parentNode, actions) => {
    const paragraph = actions.appendToParent(parentNode, {
      type: 'paragraph' as const,
      children: [],
    })
    actions.traverseLexicalChildren(lexicalNode, paragraph)
  },
  testUnistNode: 'paragraph',
  visitUnistNode: function (_, parentLexicalNode, actions): void {
    const lexicalNode = $createParagraphNode()
    parentLexicalNode.append(lexicalNode)
    actions.setCurrentUnistNodeAsParentTo(lexicalNode)
  },
}

const LinkVisitor: MarkdownImportExportVisitor<LinkNode, Mdast.Link, UnistParent> = {
  testLexicalNode: $isLinkNode,
  visitLexicalNode: (lexicalNode, parentNode, actions) => {
    const link = actions.appendToParent(parentNode, {
      type: 'link' as const,
      url: lexicalNode.getURL(),
      children: [],
    })
    actions.traverseLexicalChildren(lexicalNode, link)
  },
  testUnistNode: 'link',
  visitUnistNode: function (node, parentLexicalNode, actions): void {
    const lexicalNode = $createLinkNode(node.url)
    parentLexicalNode.append(lexicalNode)
    actions.setCurrentUnistNodeAsParentTo(lexicalNode)
  },
}

const HeadingVisitor: MarkdownImportExportVisitor<HeadingNode, Mdast.Heading, UnistParent> = {
  testLexicalNode: $isHeadingNode,
  visitLexicalNode: (lexicalNode, parentNode, actions) => {
    const heading = actions.appendToParent(parentNode, {
      type: 'heading' as const,
      depth: parseInt(lexicalNode.getTag()[1], 10) as Mdast.Heading['depth'],
      children: [],
    })
    actions.traverseLexicalChildren(lexicalNode, heading)
  },
  testUnistNode: 'heading',
  visitUnistNode: function (node, parentLexicalNode, actions): void {
    const lexicalNode = $createHeadingNode(`h${node.depth}`)
    parentLexicalNode.append(lexicalNode)
    actions.setCurrentUnistNodeAsParentTo(lexicalNode)
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

export const VISITORS = [RootVisitor, ParagraphVisitor, TextVisitor, FormattingVisitor, InlineCodeVisitor, LinkVisitor, HeadingVisitor]

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

export function importMarkdownToLexical(root: LexicalRootNode, markdown: string, visitors: Visitors): void {
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

export function exportMarkdownFromLexical(root: LexicalRootNode, visitors: Visitors): string {
  return generateMarkdownFromAst(traverseLexicalTree(root, visitors))
}
