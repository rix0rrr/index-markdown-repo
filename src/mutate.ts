import { promises as fs } from 'fs';

export interface FileMutations {
  readonly filename: string;
  readonly mutations: TextMutations[];
}

export interface Span {
  readonly startLine: number; // 1-based
  readonly endLine?: number; // Exclusive, 1-based
}

export interface TextMutations extends Span {
  readonly newContent: string;
}

export async function applyMutations(mutations: FileMutations[]) {
  await Promise.all(mutations.map(m => mutateFile(m.filename, m.mutations)));
}

export async function mutateFile(filename: string, mutations: TextMutations[]) {
  let lines = await (await fs.readFile(filename, { encoding: 'utf-8' })).split('\n');
  // Reverse sort (assuming sections are non-overlapping)
  mutations.sort((a, b) => b.startLine - a.startLine);

  for (const mut of mutations) {
    lines.splice(mut.startLine - 1, (mut.endLine ?? mut.startLine) - mut.startLine, mut.newContent);
  }

  await fs.writeFile(filename, lines.join('\n'), { encoding: 'utf-8' });
}
