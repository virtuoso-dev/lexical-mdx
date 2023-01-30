import {
  $applyNodeReplacement,
  DOMConversionMap,
  EditorConfig,
  ElementNode,
  LexicalNode,
  SerializedElementNode,
  Spread,
} from "lexical";

type FormatType = "strong" | "emphasis" | "underline";
type FormatTagName = "strong" | "em" | "u";

export type SerializedFormatNode<T extends FormatType> = Spread<
  {
    type: T;
    version: 1;
  },
  SerializedElementNode
>;

type FormatNodeThis = {
  new (key?: string): FormatNode;
  formatTagName: FormatTagName;
};

/** @noInheritDoc */
abstract class FormatNode extends ElementNode {
  static get formatType(): FormatType {
    throw new Error("formatType must be implemented");
  }

  static get formatTagName(): FormatTagName {
    throw new Error("formatTagName must be implemented");
  }

  static getType(): string {
    return this.formatType;
  }

  static clone(this: FormatNodeThis, node: FormatNode): FormatNode {
    return new this(node.__key);
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement(
      (this.constructor as unknown as FormatNode).formatTagName
    );
  }

  updateDOM(
    _prevNode: FormatNode,
    _dom: HTMLElement,
    _config: EditorConfig
  ): boolean {
    return false;
  }

  static importDOM(this: FormatNodeThis): DOMConversionMap | null {
    return {
      [this.formatTagName]: () => ({
        conversion: (_dom: HTMLElement) => {
          return {
            node: $applyNodeReplacement(new this()),
          };
        },
        priority: 0,
      }),
    };
  }

  static importJSON(): FormatNode {
    const node = $createStrongNode();
    return node;
  }

  exportJSON(): SerializedElementNode {
    return {
      ...super.exportJSON(),
      type: "strong",
      version: 1,
    };
  }
}

export class StrongNode extends FormatNode {
  static get formatType() {
    return "strong" as const;
  }
  static get formatTagName() {
    return "strong" as const;
  }
}

export class UnderlineNode extends FormatNode {
  static get formatType() {
    return "underline" as const;
  }
  static get formatTagName() {
    return "u" as const;
  }
}

export class EmphasisNode extends FormatNode {
  static get formatType() {
    return "emphasis" as const;
  }
  static get formatTagName() {
    return "em" as const;
  }
}

export function $createStrongNode(): FormatNode {
  return $applyNodeReplacement(new StrongNode());
}

export function $createEmphasisNode(): EmphasisNode {
  return $applyNodeReplacement(new EmphasisNode());
}

export function $createUnderlineNode(): UnderlineNode {
  return $applyNodeReplacement(new UnderlineNode());
}

export function $isStrongNode(
  node: LexicalNode | null | undefined
): node is StrongNode {
  return node instanceof StrongNode;
}

export function $isEmphasisNode(
  node: LexicalNode | null | undefined
): node is EmphasisNode {
  return node instanceof EmphasisNode;
}

export function $isUnderlineNode(
  node: LexicalNode | null | undefined
): node is UnderlineNode {
  return node instanceof UnderlineNode;
}
