---
name: slide-deck
title: Slide deck
description: Builds a presentation with one message per slide, action titles and a clear ask at the end. Use when someone asks for slides, a deck, a presentation or a pitch.
version: 1.0.0
owner: your-team
depth: thorough
triggers: [slides, slide deck, deck, presentation, powerpoint, pptx, pitch]
---

## Ask first
- audience: Who is the audience? [Executives | Customers | Team | Investors] (skip if: board, executive, leadership, investor, customer, client, team)
- message: What is the one thing they must remember?
- length: How many slides or minutes? (skip if: slides, minutes, min)
- template: Is there a template or brand to match? (optional)

## Skills
- pptx or slide-deck: build the PowerPoint file
- xlsx or csv-analyzer: work out the numbers if data is provided (optional)
- chart-maker: create charts for data slides (optional)

## Steps
1. Write the storyline first: one sentence per slide, ending with the ask.
2. Show the storyline to the user before designing slides.
3. Build slides: an action title that states the point, then evidence.
4. Put detail in speaker notes, not on the slide.

## Output
A deck file, plus the storyline as a short numbered list in your reply.

## Done when
- Each slide title is a full sentence stating its point.
- Slide count fits the time available (about one slide per 2 minutes).
- Every chart and number cites its source.
- The last slide states the ask or next step.

## Examples
- make a board deck about Q3 results
- create a 10 slide pitch for investors
- turn this plan into a presentation for the team

## Not for
- a written report or memo
- analyse this spreadsheet
