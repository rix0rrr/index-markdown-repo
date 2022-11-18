import * as path from 'path';
import * as commonmark from 'commonmark';
import { FileMutations as FileMutation, Span, TextMutations as TextMutation } from './mutate';
import { MarkdownDirectory, MarkdownDocument, MarkdownFsObject, MarkdownSection } from './types';

export interface IndexObjectOptions {
  readonly prev?: MarkdownFsObject;
  readonly next?: MarkdownFsObject;
  readonly up?: MarkdownFsObject;
}

export function indexObject(object: MarkdownFsObject, options: IndexObjectOptions = {}): FileMutation[] {
  switch (object.type) {
    case 'directory':
      return indexDirectory(object, options);
    case 'document':
      return [indexDocument(object, options)];
  }
}

export function indexDirectory(object: MarkdownDirectory, options: IndexObjectOptions = {}): FileMutation[] {
  const ret = new Array<FileMutation>();

  for (let i = 0; i < object.entries.length; i++) {
    ret.push(...indexObject(object.entries[i], {
      prev: i > 0 ? object.entries[i-1] : undefined,
      next: i < object.entries.length - 1 ? object.entries[i+1] : undefined,
      up: object.rootDocument,
    }));
  }

  // Only if a root document already exists, easier given what we have for now and mostly always true anyway
  if (object.rootDocument) {
    const mutations = new Array<TextMutation>();

    // Render toc of files in this directory
    const toc = renderFileToc(object.rootDocument.filename, object.entries);
    mutations.push(makeMutation(object.rootDocument.tree, 'TOC', toc, ['h2', 'bottom']));

    // Render nav to other directories
    const nav = renderNav(object.rootDocument.filename, options);
    mutations.push(makeMutation(object.rootDocument.tree, 'NAV', nav, ['top']));

    ret.push({ filename: object.rootDocument.filename, mutations });
  }

  return ret;
}

export function indexDocument(object: MarkdownDocument, options: IndexObjectOptions = {}): FileMutation {
  const mutations = new Array<TextMutation>();

  const toc = renderSectionToc(object.sections, 3);
  mutations.push(makeMutation(object.tree, 'TOC', toc, ['h2', 'bottom']));

  const nav = renderNav(object.filename, options);
  mutations.push(makeMutation(object.tree, 'NAV', nav, ['top']));

  return { filename: object.filename, mutations };
}

function renderFileToc(filename: string, contents: MarkdownFsObject[]): string {
  if (contents.length === 0) { return ''; }

  const ret = new Array<string>();
  ret.push('--------------');
  ret.push('In this directory');
  ret.push('');
  for (const entry of contents) {
    ret.push(`- ${makeFsLink(filename, entry)}`);
  }
  ret.push('--------------');
  return ret.join('\n');
}

function renderSectionToc(sections: MarkdownSection[], maxLevel: number): string {
  if (sections.length === 0) { return ''; }

  const ret = new Array<string>();
  ret.push('--------------');
  ret.push('Table of Contents');
  ret.push('');
  sections.forEach(recurse);
  ret.push('--------------');
  return ret.join('\n');

  function recurse(section: MarkdownSection) {
    if (section.level > maxLevel) { return; }

    ret.push(`${'  '.repeat(Math.max(0, section.level - 2))}- [${section.title}](${section.anchor})`);
    section.sections.forEach(recurse);
  }
}

function renderNav(filename: string, options: IndexObjectOptions): string {
  if (!options.prev && !options.next && !options.up) { return ''; }

  const prevLink = options.prev ? makeFsLink(filename, options.prev) : '';
  const prevTitle = prevLink ? '← Previous' : '';
  const upLink = options.up ? makeFsLink(filename, options.up) : '';
  const upTitle = upLink ? '↑ Up' : '';
  const nextLink = options.next ? makeFsLink(filename, options.next) : '';
  const nextTitle = nextLink ? 'Next →' : '';

  return [
    `| ${prevTitle} | ${upTitle} | ${nextTitle} |`,
    '|:--|:-:|--:|',
    `| ${prevLink} | ${upLink} | ${nextLink} |`,
  ].join('\n');
}

function makeMutation(doc: commonmark.Node, marker: string, newContent: string, insertLocations: InsertLocation[]): TextMutation {
  let mark = findMarker(doc, marker);

  while (mark === undefined && insertLocations.length > 0) {
    mark = findInsertLocation(doc, insertLocations.shift()!);
  }
  if (mark === undefined) {
    mark = findEnd(doc);
  }

  return {
    ...mark,
    newContent: [
      beginMarker(marker),
      ...newContent ? [newContent] : [],
      endMarker(marker),
    ].join('\n'),
  };
}

function findMarker(doc: commonmark.Node, marker: string): Span | undefined {
  let startLine: number | undefined;
  let endLine: number | undefined;

  const walker = doc.walker();
  let current;
  while (current = walker.next()) {
    if (!current.entering) { continue; }
    if (current.node.type === 'html_block' && current.node.literal === beginMarker(marker)) {
      startLine = current.node.sourcepos[0][0];
    }
    if (current.node.type === 'html_block' && current.node.literal === endMarker(marker)) {
      endLine = current.node.sourcepos[0][0] + 1; // Eat entire line
    }
  }

  return startLine ? { startLine, endLine } : undefined;
}

function beginMarker(marker: string) {
  return `<!-- BEGIN ${marker} -->`;
}

function endMarker(marker: string) {
  return `<!-- END ${marker} -->`;
}

type InsertLocation = 'h2' | 'bottom' | 'top';


function findInsertLocation(doc: commonmark.Node, loc: InsertLocation): Span | undefined {
  switch (loc) {
    case 'bottom':
      return findEnd(doc);
    case 'h2':
      return findH2(doc);
    case 'top':
      return findStart();
  }
}

function findH2(doc: commonmark.Node): Span | undefined {
  const walker = doc.walker();
  let current;
  while (current = walker.next()) {
    if (!current.entering) { continue; }
    if (current.node.type === 'heading' && current.node.level === 2) {
      return { startLine: current.node.sourcepos[0][0] };
    }
  }
  return undefined;
}

function findEnd(doc: commonmark.Node): Span {
  return { startLine: doc.sourcepos[1][0] + 1 };
}

function findStart(): Span {
  return { startLine: 1 };
}

function makeFsLink(filename: string, obj: MarkdownFsObject) {
  if (filename.endsWith('.md')) {
    // Link relative to directory
    filename = path.dirname(filename);
  }

  let link = path.posix.relative(filename, obj.filename);
  if (link === '.' || link === '') {
    link = 'README.md';
  }

  return `[${obj.title}](${link})`;
}