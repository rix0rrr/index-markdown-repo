import * as commonmark from 'commonmark';

export type MarkdownFsObject =
  | MarkdownDirectory
  | MarkdownDocument;

export interface MarkdownDirectory {
  readonly type: 'directory';
  readonly filename: string;
  readonly title: string;
  readonly entries: MarkdownFsObject[];
  readonly rootDocument?: MarkdownDocument;
}

export interface MarkdownDocument {
  readonly type: 'document';
  readonly filename: string;
  readonly title: string;
  readonly sections: MarkdownSection[];
  readonly tree: commonmark.Node;
}

export interface MarkdownSection {
  readonly type: 'title';
  readonly level: number;
  readonly title: string;
  readonly filename: string;
  readonly anchor: string;
  readonly sections: MarkdownSection[];
}