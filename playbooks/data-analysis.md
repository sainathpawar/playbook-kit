---
name: data-analysis
title: Data analysis
description: Analyses a spreadsheet or CSV to answer a specific question, with a clear finding, charts and data-quality notes. Use when someone shares data (.csv, .xlsx, a table) and asks for trends, metrics, comparisons or insights.
version: 1.0.0
owner: your-team
depth: standard
triggers: [analyze, analyse, analysis, csv, excel, spreadsheet, dataset, trends, metrics, insights, feedback]
---

## Ask first
- question: What question should the data answer? (skip if: why, which, how many, how much, compare, trend)
- source: Where is the data? (skip if: .csv, .xlsx, .xls, attached, sheet)
- output: What should you get back? [Short answer | Charts | Spreadsheet | Written findings]
- period: Which time period or subset matters? (optional)

## Skills
- xlsx or csv-analyzer: read and calculate on the data
- chart-maker: draw the charts (optional)

## Steps
1. Load the data and report its shape: rows, columns, date range.
2. Check quality: missing values, duplicates, obvious outliers. Fix what is safe and say what you changed.
3. Answer the question with the simplest calculation that does it.
4. Make at most three charts, each supporting one finding.
5. State the answer first, then the evidence.

## Output
One-sentence answer, then 3-5 findings with numbers, then charts, then a short "Data notes" section on quality issues and assumptions.

## Done when
- The original question is answered in the first sentence.
- Every number can be traced to a calculation on the data.
- Charts have a title, labelled axes and units.
- Data quality issues are listed, even if none were found.

## Examples
- analyze sales.csv and tell me which region grew fastest
- what trends do you see in this spreadsheet of support tickets
- compare monthly revenue across products in the attached excel

## Not for
- build a slide deck from this data
- write my weekly report
