import { describe, it } from 'vitest'
import { $isRootNode, LexicalNode, RootNode as LexicalRootNode, ElementNode as LexicalElementNode } from 'lexical'
import type { Node as UnistNode, Parent as UnistParent } from 'unist'
import * as Mdast from 'mdast'

interface VisitActions<LN extends LexicalNode, N extends UnistNode, P extends UnistNode | null> {
  appendToParent(parentNode: P, node: N): N
  traverseLexicalChildren(lexicalNode: LN, parentUnistNode: N): void
}

interface LexicalNodeVisitor<LN extends LexicalNode, UN extends UnistNode, ParentNode extends UnistNode | null> {
  test(lexicalNode: LexicalNode): lexicalNode is LN
  visit(lexicalNode: LN, parentNode: ParentNode, actions: VisitActions<LN, UN, ParentNode>): void
  shouldJoin?(prevNode: UnistNode, currentNode: UN): boolean
  join?(prevNode: UN, currentNode: UN): UN
}

const RootNodeVisitor: LexicalNodeVisitor<LexicalRootNode, Mdast.Root, null> = {
  test: $isRootNode,
  visit: (lexicalNode, _, actions) => {
    const root = actions.appendToParent(null, {
      type: 'root',
      children: [],
    })
    actions.traverseLexicalChildren(lexicalNode, root)
  },
}

function isParent(node: UnistNode): node is UnistParent {
  return (node as any).children instanceof Array
}

function traverseLexicalTree(
  root: LexicalRootNode,
  visitors: Array<LexicalNodeVisitor<LexicalNode, UnistNode, UnistNode | null>>
): UnistParent {
  let unistRoot: UnistNode | null = null

  visit(root, null)

  function appendToParent(parentNode: UnistNode, node: UnistNode): UnistNode {
    if (unistRoot === null) {
      unistRoot = node
      return unistRoot
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
        return joinedNode
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
    const visitor = visitors.find((visitor) => visitor.test(lexicalNode))
    if (!visitor) {
      throw new Error('no visitor found for', { cause: lexicalNode })
    }

    visitor.visit(lexicalNode, parentNode, {
      appendToParent,
      traverseLexicalChildren,
    })
  }

  if (unistRoot === null) {
    throw new Error('traversal ended with no root element')
  }
  return unistRoot
}

describe('lexical tree traversal', () => {
  it('generates root node from a Lexical RootNode', () => {
    const root = traverseLexicalTree(new LexicalRootNode(), [RootNodeVisitor])
    console.log(root)
  })
})
