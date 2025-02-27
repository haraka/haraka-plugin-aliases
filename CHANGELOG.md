# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).

### Unreleased

### [1.0.3] - 2025-01-30

- prettier: move config into package.json
- dep(eslint): upgrade to v9

### [1.0.2] - 2024-04-29

- fix: log when doing operations. Fixes #14
- index: make separate if blocks in cascading list
- fix: rename config/aliases to config/aliases.json
- fix: wildcard + domain matches before domain. Fixes #15
- lint: remove duplicate / stale rules from .eslintrc
- dep: eslint-plugin-haraka -> @haraka/eslint-config
- deps: bump to latest versions
- chore: populate [files] in package.json
- doc(CHANGELOG) renamed from Changes
- doc(CONTRIBUTORS): added
- doc(README): fix URL for CI tests
- ci: update to shared GHA workflows
- added the option to alias all emails with \* (#12)

### 1.0.1 - 2022-05-26

- synced from Haraka/plugins/aliases
- dep(eslint): 3 -> 8
- chore(ci): add github workflows, codeql, ci, publish
- chore(ci): delete travis and appveyor configs
- chore: ignore package-lock.json
- chore(test): replaced nodeunit with mocha
- lint: use shorthand in tests

### 1.0.0 - 2017-09-01

- imported from haraka

[1.0.1]: https://github.com/haraka/haraka-plugin-aliases/releases/tag/v1.0.1
[1.0.2]: https://github.com/haraka/haraka-plugin-aliases/releases/tag/v1.0.2
[1.0.3]: https://github.com/haraka/haraka-plugin-aliases/releases/tag/v1.0.3
