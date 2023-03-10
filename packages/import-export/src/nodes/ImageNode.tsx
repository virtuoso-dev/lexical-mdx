import React from 'react'
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical'

import { DecoratorNode } from 'lexical'

export interface ImagePayload {
  altText: string
  title?: string
  key?: NodeKey
  src: string
}

function convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const { alt: altText, src, title } = domNode
    const node = $createImageNode({ altText, src, title })
    return { node }
  }
  return null
}

export type SerializedImageNode = Spread<
  {
    altText: string
    title?: string
    src: string
    type: 'image'
    version: 1
  },
  SerializedLexicalNode
>

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string
  __altText: string
  __title: string | undefined

  static getType(): string {
    return 'image'
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__title, node.__key)
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, title, src } = serializedNode
    const node = $createImageNode({
      altText,
      title,
      src,
    })
    return node
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img')
    element.setAttribute('src', this.__src)
    element.setAttribute('alt', this.__altText)
    if (this.__title) {
      element.setAttribute('title', this.__title)
    }
    return { element }
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    }
  }

  constructor(src: string, altText: string, title: string | undefined, key?: NodeKey) {
    super(key)
    this.__src = src
    this.__title = title
    this.__altText = altText
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      title: this.getTitle(),
      src: this.getSrc(),
      type: 'image',
      version: 1,
    }
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span')
    const theme = config.theme
    const className = theme.image
    if (className !== undefined) {
      span.className = className
    }
    return span
  }

  updateDOM(): false {
    return false
  }

  getSrc(): string {
    return this.__src
  }

  getAltText(): string {
    return this.__altText
  }

  getTitle(): string | undefined {
    return this.__title
  }

  decorate(): JSX.Element {
    return <img title={this.__title} src={this.__src} alt={this.__altText} />
  }
}

export function $createImageNode({ altText, title, src, key }: ImagePayload): ImageNode {
  return new ImageNode(src, altText, title, key)
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode
}
