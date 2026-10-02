---
name: meeting-summary
title: Meeting summary
description: Turns meeting notes or a transcript into a summary with decisions, action items with owners, and open questions. Use when someone shares notes, a transcript or a recording and asks for a summary, minutes or follow-up.
version: 1.0.0
owner: your-team
depth: quick
triggers: [meeting, minutes, transcript, notes, recap, follow-up, action items]
---

## Ask first
- recipients: Who gets the summary? [Attendees only | Wider team | Leadership] (optional)

## Steps
1. Read the whole transcript or notes before writing anything.
2. Pull out decisions, action items (owner + due date) and unresolved questions.
3. Mark any action item without a clear owner as "owner needed".
4. Draft a short follow-up message for the attendees.

## Output
Sections: **Summary** (3 bullets), **Decisions**, **Action items** (owner, task, due date), **Open questions**, **Draft follow-up**.

## Done when
- Every action item has an owner or is marked "owner needed".
- Decisions are separated from discussion.
- Nothing appears that wasn't said in the meeting.

## Examples
- summarise this meeting transcript
- write minutes and action items from my notes
- recap today's call and draft the follow-up email

## Not for
- write my weekly report
- prepare an agenda for tomorrow
