---
name: research-brief
title: Research brief
description: Researches a question across sources and writes a short, cited brief that ends with a recommendation. Use when someone asks to research, compare options, evaluate vendors or tools, or investigate a market or topic.
version: 1.0.0
owner: your-team
depth: thorough
triggers: [research, compare, comparison, evaluate, alternatives, options, vendors, market, investigate, versus, vs]
---

## Ask first
- decision: What decision will this inform? (skip if: decide, choose, pick, should we)
- criteria: Which criteria matter most? [Cost | Quality | Speed | Risk] (optional)
- depth: Quick overview or deep dive? [Quick overview | Deep dive] (skip if: quick, brief, deep dive, detailed)

## Skills
- deep-research or web-research: gather and cross-check sources (optional)

## Steps
1. Restate the question and the decision it supports in one sentence each.
2. Gather sources; prefer primary sources and recent ones for fast-moving topics.
3. Compare options on the stated criteria in a table.
4. Make a recommendation and state its main trade-off.

## Output
One-paragraph answer, a comparison table, a recommendation with trade-offs, then a source list.

## Done when
- Every factual claim has a source.
- Options are compared on the same criteria.
- The recommendation states what would change it.

## Examples
- research the best CRM tools for a 20 person sales team
- compare AWS and GCP pricing for our workload
- investigate the market for AI note-taking apps

## Not for
- analyse this spreadsheet
- review my pull request
