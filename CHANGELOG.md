# Changelog

All notable changes are listed here. This project follows [Semantic Versioning](https://semver.org/).

## 0.1.0 — first public release

- Playbook format: one Markdown file per recurring task (questions, skills, steps, output, done criteria, examples, not-for).
- Compiler to native formats: Agent Skills for Claude Code, Codex, GitHub Copilot, Cursor and Gemini CLI; ChatGPT skill upload zip; Microsoft 365 Copilot Cowork skill folder; VS Code Copilot prompt file; paste-anywhere prompt.
- `check`: structure, Agent Skills limits, competing playbooks, skills not installed.
- `test`: routing regression tests from each playbook's Examples and Not for lists.
- `match`: which playbook a request picks and what it will still ask.
- 8 starter playbooks and a `playbook-author` skill.
- Library API with zero runtime dependencies.
