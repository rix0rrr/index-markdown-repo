# index-markdown-repo

Add navigation to a GitHub repo of Markdown files

## Usage

Designed to be run as GitHub Workflow.

Put the following into `.github/workflows/index-markdown.yaml`:

```
name: index-markdown-repo
on:
  pull_request_target:
    branches:
      - 'main'
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v2
        with:
          ref: ${{ github.head_ref }}
      - run: npx index-markdown-repo && git add -A .
      - uses: stefanzweifel/git-auto-commit-action@v4
        with:
          commit_message: Automatically update Markdown nav
```

## Tip

To browse the results locally:

```shell
$ pip install grip
$ grip
```
