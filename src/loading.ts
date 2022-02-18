import { promises as fs } from 'fs';
import * as path from 'path';
import * as commonmark from 'commonmark';
import { MarkdownDirectory, MarkdownDocument, MarkdownFsObject, MarkdownSection } from './types';

export async function load(fsname: string): Promise<MarkdownFsObject> {
  const stat = await fs.stat(fsname);

  return stat.isDirectory() ? loadDirectory(fsname) : loadDocument(fsname);
}

export async function loadDirectory(dirname: string): Promise<MarkdownDirectory> {
  const entries = (await fs.readdir(dirname, { encoding: 'utf-8' }))
    .filter(e => e !== 'README.md' && !e.startsWith('.'));
  entries.sort((a, b) => a.localeCompare(b));

  const rootDocument = await fileExists(path.join(dirname, 'README.md'))
    ? await loadDocument(path.join(dirname, 'README.md'))
    : undefined;

  return {
    type: 'directory',
    title: rootDocument?.title ?? path.basename(dirname),
    filename: dirname,
    rootDocument,
    entries: (await Promise.all(entries.map(e => load(path.join(dirname, e))))).filter(hasContent),
  };
}

function hasContent(x: MarkdownFsObject) {
  return (x.type === 'document' && x.filename.endsWith('.md')) ||
    (x.type === 'directory' && (x.rootDocument || x.entries.length > 0));
}

export async function loadDocument(filename: string): Promise<MarkdownDocument> {
  var reader = new commonmark.Parser();

  const contents = await fs.readFile(filename, { encoding: 'utf-8' });
  const tree = reader.parse(contents);

  const headings = findHeadings(tree);

  let title = path.basename(filename, '.md');
  if (headings[0]?.level === 1) {
    title = textOf(headings[0]);
    headings.shift();
  }

  return {
    type: 'document',
    filename,
    sections: findSections(filename, headings),
    title,
    tree,
  };
}

function findHeadings(root: commonmark.Node): commonmark.Node[] {
  const ret = new Array<commonmark.Node>();
  const walker = root.walker();
  let current;
  while (current = walker.next()) {
    if (!current.entering || current.node === root) { continue; }

    if (current.node.type === 'heading') {
      ret.push(current.node);
    }
  }
  return ret;
}

function findSections(filename: string, headings: commonmark.Node[]): MarkdownSection[] {
  const ret = new Array<MarkdownSection>();
  headings = [...headings];

  while (headings.length > 0) {
    ret.push(buildOne(headings.shift()!));
  }

  return ret;

  function buildOne(current: commonmark.Node): MarkdownSection {
    const title = textOf(current);

    const sections = new Array<MarkdownSection>();
    while (headings.length > 0 && headings[0].level > current.level) {
      sections.push(buildOne(headings.shift()!));
    }

    return {
      type: 'title',
      filename,
      level: current.level,
      title,
      anchor: anchorFromTitle(title),
      sections,
    };
  }
}

function textOf(node: commonmark.Node) {
  const ret = new Array<string>();

  const walker = node.walker();
  let current;
  while (current = walker.next()) {
    if (!current.entering) { continue; }
    if (current.node.type === 'text') {
      ret.push(current.node.literal ?? '');
    }
  }
  return ret.join(' ');
}

function anchorFromTitle(title: string) {
  // Based on GitHub conventions
  return '#' + title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().replace(/^-|-$/g, '');
}

async function fileExists(filename: string) {
  try {
    await fs.stat(filename);
    return true;
  } catch (e: any) {
    if (e.code !== 'ENOENT') { throw e; }
    return false;
  }
}