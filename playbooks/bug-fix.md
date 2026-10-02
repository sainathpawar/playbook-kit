---
name: bug-fix
title: Bug fix
description: Finds the root cause of a bug, fixes it minimally and adds a test that proves it. Use when someone reports an error, crash, failing test, stack trace or something that is broken or not working.
version: 1.0.0
owner: your-team
depth: standard
triggers: [bug, fix, error, broken, crash, exception, failing test, stack trace, regression]
---

## Ask first
- repro: How do you reproduce it (steps, input, command)? (skip if: steps, reproduce, run, command, test, stack trace)
- expected: What should happen instead? (skip if: should, expected, instead)
- since: Did it start after a specific change or deploy? (optional)

## Skills
- debug: structured reproduce, isolate, diagnose (optional)

## Steps
1. Reproduce the bug before changing code. If you can't, say so and stop.
2. Find the root cause, not just the line that throws.
3. Write a failing test that captures the bug.
4. Make the smallest change that makes the test pass.
5. Run the related test suite.

## Output
Short explanation of the root cause, the diff, the new test, and any follow-up risks.

## Done when
- A test reproduces the bug and now passes.
- The change touches only what the fix needs.
- The root cause is explained in one or two sentences.

## Examples
- fix the failing login test after the deploy
- the app crashes with this stack trace when I upload a file
- checkout is broken since yesterday, can you fix it

## Not for
- review my pull request
- add a new feature
