---
name: code-review
title: Code review
description: Reviews a pull request, diff or files for correctness, security and maintainability, with findings ranked by severity and suggested fixes. Use when someone asks to review code, a PR or a diff before merging.
version: 1.0.0
owner: your-team
depth: quick
triggers: [review, code review, pull request, pr, diff, merge]
---

## Ask first
- target: What should be reviewed (PR link, branch, files)? (skip if: pr, pull, diff, branch, .ts, .js, .py, .go, .java)
- focus: Anything to focus on? [Correctness | Security | Performance | Everything] (optional)

## Skills
- code-review: run the review checklist (optional)

## Steps
1. Understand what the change is meant to do before judging it.
2. Look for correctness bugs, security issues, missing tests and unclear code, in that order.
3. Rank findings: must fix, should fix, nit.
4. For each finding, point to the exact line and suggest a fix.

## Output
A verdict (approve / approve with changes / request changes), then findings grouped by severity.

## Done when
- Every finding has a location and a suggested fix.
- Must-fix items are clearly separated from nits.
- The verdict matches the findings.

## Examples
- review my PR before I merge
- can you review this diff for security issues
- look over the changes in this branch

## Not for
- fix this bug
- write tests for this module
