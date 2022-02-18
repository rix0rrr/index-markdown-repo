const { typescript } = require('projen');

const project = new typescript.TypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'index-markdown-repo',
  description: 'Indexes a repository full of MarkDown files',
  repository: 'https://github.com/rix0rrr/index-markdown-repo',
  authorName: 'Rico Huijbers',

  bin: {
    'index-markdown-repo': 'bin/index-markdown-repo',
  },

  deps: ['commonmark'],
  devDeps: ['@types/commonmark'],
  releaseToNpm: true,
  tsconfig: {
    compilerOptions: {
      target: 'ES2019',
      lib: ['es2019'], // allow Array.prototype.flat etc.
    },
  },
});
project.synth();