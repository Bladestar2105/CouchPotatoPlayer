---
name: bugfix-workflow
description: Investigate and fix bugs in CouchPotatoPlayer with a root-cause-first approach.
---

# Bugfix Workflow Skill

## Purpose
Use this skill when the task is to diagnose and fix a defect.

## Method
1. Restate the visible symptom.
2. Trace the execution path.
3. Identify the root cause.
4. Implement the smallest safe fix.
5. Add or update regression coverage if practical.
6. Document any edge cases or residual risk.

## Rules
- Do not patch blindly.
- Avoid unrelated cleanup in the same change.
- Prefer preserving existing architecture unless it directly causes the bug.
- Mention if the issue could affect other modules.

## Output format
Provide:
- symptom
- root cause
- fix summary
- files changed
- validation performed
- open risks
