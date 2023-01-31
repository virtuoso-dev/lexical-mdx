import type { Root, Paragraph, Text, Emphasis, Strong } from "mdast";
import { MdxJsxTextElement } from "mdast-util-mdx";

export type ParentNode =
  | Root
  | Paragraph
  | Emphasis
  | Strong
  | MdxJsxTextElement;
type Node = ParentNode | Text;

export interface MdxNode {
  type: Node["type"];
  toTree(): any;
  shouldJoinWith(next: MdxNode): boolean;
  join<T extends this>(next: T): T;
}

export abstract class ParentMdxNode<MdastNodeType extends ParentNode>
  implements MdxNode
{
  abstract type: MdastNodeType["type"];
  additionalAttributes: { name?: string; attributes?: Array<any> } = {};
  constructor(public children: MdxNode[] = []) {}

  join<T extends this>(_node: T): T {
    throw new Error("Method not implemented.");
  }

  shouldJoinWith(_node: MdxNode): boolean {
    return false;
  }

  append<T extends MdxNode>(node: T): T {
    const lastChild = this.children[this.children.length - 1];
    if (lastChild?.shouldJoinWith(node)) {
      const joined = lastChild.join(node);
      this.children.splice(this.children.length - 1, 1, joined);
      return joined as T;
    } else {
      this.children.push(node);
      return node;
    }
  }

  toTree(): MdastNodeType {
    return {
      type: this.type,
      children: this.children.map(
        (child) => child.toTree() as MdastNodeType["children"][number]
      ),
      ...this.additionalAttributes,
    } as MdastNodeType;
  }
}

export class RootMdxNode extends ParentMdxNode<Root> {
  type = "root" as const;
}

export class ParagraphMdxNode extends ParentMdxNode<Paragraph> {
  type = "paragraph" as const;
}

abstract class CollapsibleMdxNode<
  MdastNodeType extends ParentNode
> extends ParentMdxNode<MdastNodeType> {
  shouldJoinWith(next: MdxNode): boolean {
    return next.type === this.type;
  }

  join<T extends this>(next: T) {
    return new (this as any).constructor([...this.children, ...next.children]);
  }
}

export class EmphasisMdxNode extends CollapsibleMdxNode<Emphasis> {
  type = "emphasis" as const;
}

export class StrongMdxNode extends CollapsibleMdxNode<Strong> {
  type = "strong" as const;
}

export class UnderlineMdxNode extends CollapsibleMdxNode<MdxJsxTextElement> {
  type = "mdxJsxTextElement" as const;
  additionalAttributes: ParentMdxNode["additionalAttributes"] = {
    name: "u",
    attributes: [],
  };
}

export class TextMdxNode implements MdxNode {
  type = "text" as const;

  constructor(public value: string) {}

  shouldJoinWith(next: MdxNode): boolean {
    return next.type === "text";
  }

  join<T extends TextMdxNode>(next: T): T {
    return new TextMdxNode(this.value + (next as TextMdxNode).value) as T;
  }

  toTree(): Text {
    return {
      type: "text",
      value: this.value,
    };
  }
}
