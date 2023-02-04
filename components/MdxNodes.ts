import type { Root, Paragraph, Blockquote, Text, Emphasis, Strong, Heading, List, ListItem, InlineCode, Link } from 'mdast'
import { MdxJsxTextElement } from 'mdast-util-mdx'

export type ParentNode = Root | Paragraph | Heading | Blockquote | Emphasis | Strong | List | ListItem | MdxJsxTextElement | Link
type Node = ParentNode | Text

export interface MdxNode {
  type: Node['type'] | 'inlineCode'
  toTree(): any
  shouldJoinWith(next: MdxNode): boolean
  join<T extends this>(next: T): T
}

export abstract class ParentMdxNode<MdastNodeType extends ParentNode> implements MdxNode {
  abstract type: MdastNodeType['type']
  get additionalAttributes() {
    return {} as any
  }
  constructor(public children: MdxNode[] = []) {}

  join<T extends this>(_node: T): T {
    throw new Error('Method not implemented.')
  }

  shouldJoinWith(_node: MdxNode): boolean {
    return false
  }

  append<T extends MdxNode>(node: T): T {
    const lastChild = this.children[this.children.length - 1]
    if (lastChild?.shouldJoinWith(node)) {
      const joined = lastChild.join(node)
      this.children.splice(this.children.length - 1, 1, joined)
      return joined
    } else {
      this.children.push(node)
      return node
    }
  }

  toTree(): MdastNodeType {
    return {
      type: this.type,
      children: this.childrenContents(),
      ...this.additionalAttributes,
    } as MdastNodeType
  }

  childrenContents() {
    return this.children.map((child) => child.toTree() as MdastNodeType['children'][number])
  }
}

export class RootMdxNode extends ParentMdxNode<Root> {
  type = 'root' as const
}

export class HeadingMdxNode extends ParentMdxNode<Heading> {
  type = 'heading' as const
  constructor(public children: MdxNode[] = [], public depth: Heading['depth']) {
    super(children)
  }

  get additionalAttributes() {
    return { depth: this.depth }
  }
}

export class ParagraphMdxNode extends ParentMdxNode<Paragraph> {
  type = 'paragraph' as const
}

export class LinkMdxNode extends ParentMdxNode<Link> {
  type = 'link' as const

  constructor(public children: MdxNode[] = [], public url: string) {
    super(children)
  }

  get additionalAttributes() {
    return { url: this.url }
  }
}
export class ListMdxNode extends ParentMdxNode<List> {
  type = 'list' as const
  constructor(public children: MdxNode[] = [], public ordered: boolean) {
    super(children)
  }

  get additionalAttributes() {
    return { ordered: this.ordered, spread: false }
  }
}

export class ListItemMdxNode extends ParentMdxNode<ListItem> {
  type = 'listItem' as const

  get additionalAttributes() {
    return { spread: false }
  }
}

export class BlockquoteMdxNode extends ParentMdxNode<Blockquote> {
  type = 'blockquote' as const

  // apparently, blockquotes need paragraphs for the markdown generation to work.
  toTree(): Blockquote {
    return {
      type: 'blockquote',
      children: [
        {
          type: 'paragraph',
          children: this.childrenContents() as any,
        },
      ],
    }
  }
}

abstract class CollapsibleMdxNode<MdastNodeType extends ParentNode> extends ParentMdxNode<MdastNodeType> {
  shouldJoinWith(next: MdxNode): boolean {
    return next.type === this.type
  }

  join<T extends this>(next: T) {
    return new (this as any).constructor([...this.children, ...next.children])
  }
}

export class EmphasisMdxNode extends CollapsibleMdxNode<Emphasis> {
  type = 'emphasis' as const
}

export class StrongMdxNode extends CollapsibleMdxNode<Strong> {
  type = 'strong' as const
}

export class UnderlineMdxNode extends CollapsibleMdxNode<MdxJsxTextElement> {
  type = 'mdxJsxTextElement' as const
  get additionalAttributes() {
    return {
      name: 'u',
      attributes: [],
    }
  }
}

export class TextMdxNode implements MdxNode {
  type = 'text' as const

  constructor(public value: string) {}

  shouldJoinWith(next: MdxNode): boolean {
    return next.type === 'text'
  }

  join<T extends TextMdxNode>(next: T): T {
    return new TextMdxNode(this.value + (next as TextMdxNode).value) as T
  }

  toTree(): Text {
    return {
      type: 'text',
      value: this.value,
    }
  }
}

export class InlineCodeMdxNode implements MdxNode {
  type = 'inlineCode' as const
  constructor(public value: string) {}

  shouldJoinWith(): boolean {
    return false
  }

  join(): any {
    throw new Error('code nodes should not join')
  }

  toTree(): InlineCode {
    return {
      type: this.type,
      value: this.value,
    }
  }
}
