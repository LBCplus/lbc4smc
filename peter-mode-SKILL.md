---
name: peter-mode
description: "Apply to ALL engineering tasks, architecture decisions, code reviews, feature builds, and technical discussions. This is the foundational engineering philosophy for all EmpathySystem.ai, MyLocalBoard, and MPT.social development. Triggers on: ANY code creation, ANY feature design, ANY database schema, ANY API endpoint, ANY AI pipeline, ANY deployment, ANY security review, ANY frontend component, ANY new service/job/module. Always run the relevant checklist before building. Named for Peter Wang, CTO of EmpathySystem.ai, who rebuilt the platform from 535 models to 27."
---

# Peter Mode — Engineering Standards

> Named for Peter Wang, CTO of EmpathySystem.ai, who rebuilt the platform from 535 models to 27.
> Derived from real codebase audits, production incidents, and hard-won lessons.
> When in doubt, ask: "Would I want this for someone I love?"

## The 30-Minute Rule (Applies to ALL Standards)

**If the same approach has failed 3 times or you've been debugging for 30 minutes, STOP. Step back. Ask: "Am I using the right tool, the right architecture, the right approach?" The answer is almost always no.**

This rule exists because of two real incidents:
- 3 hours tweaking Gemini transcription parameters before switching to Whisper (which worked in 2 minutes)
- 2+ hours adding system prompt instructions and reordering context before switching from Gemini to GPT-4o-mini (which followed instructions immediately)

Both times the fix was switching tools, not tweaking the tool we had. When you're debugging, you're too close. Step back, reassess, and consider whether the tool itself is wrong.

## The Nine Standards

### 1. Wire Before Build

**Before creating ANY new service, job, or module, identify its caller.**

Audit found 79 unreachable services (7.8%) and 76 orphaned jobs (37.4%) — all correct, all tested, all delivering zero value.

1. Identify the caller — if nobody calls it, don't build it
2. Write the call site first — let it fail with NameError
3. Build the service to match the caller's expected interface
4. Verify: `grep -rn "ClassName" app/` must show ≥1 caller outside the file
5. Integration test from entry point through service

Pipeline rule: Wire ALL stages in the orchestrator before implementing any.

### 2. Horizontal Architecture

**Before creating any new model/table: "Can an existing table handle this?"**

Five Questions:
1. Is this an event? → Event table (category + action + data JSONB + trackable poly)
2. State transitions? → No state machine? → JSONB or Event, not a table
3. Anything belongs_to it? → No FK? → JSONB on parent
4. >10K rows in 2 years? → No? → Constants/YAML
5. Does CODE need this, or just domain language? → Challenge it

Exception: A new data type that represents a genuinely different entity passes this test. Example: transcript_chunks are not meetings — they're 400-word paragraphs with their own embeddings. That's a new table.

Target: ~25 models for a full platform. Peter hit 27.

### 3. Adversarial Security Review

**Before any code touching auth/data/input, answer out loud:**
1. How could an attacker abuse this?
2. Does this match ALL other similar code?
3. What if this input is malicious?
4. What if values are nil?

Six patterns: fail-closed auth (return after denial), scoped queries (current_user.records), expiring resources (5 min URLs), immutable audit trail, input sanitization before LLM/DB, kill switch before every LLM call.

MMASA: Cross-provider adversarial auditing finds ~2.5x more vulnerabilities than single-model review.

### 4. Cost-Aware LLM Design

**Three rules, in order:**

**Rule Zero — Purpose-built tools first.** If a non-LLM solution existed before 2020, use it. Whisper for audio, Tesseract for OCR, pdfplumber for PDFs.

**Rule One — Tool fitness over tool cost.** A tool that won't follow instructions is wrong regardless of price. Gemini was cheaper than GPT-4o-mini but suppressed public record content. The right tool is the one that does the job, not the cheapest one that doesn't.

**Rule Two — Right tier for the task.** Only user-facing conversation needs frontier. Structured output → default (10-12x cheaper). Classification → small (50-100x cheaper). Evals → nano (minimum cost).

Decision matrix:
1. Purpose-built tool exists? → Use it. STOP.
2. Does the tool follow instructions for this domain? → No? Switch providers.
3. User reads output? → Frontier
4. Structured JSON? → Default
5. Binary decision? → Small

Model names NEVER hardcoded. Config-driven tier resolution via models.yaml.

### 5. Eval-Driven Development

**Write the eval BEFORE the feature. Done when eval passes, not when code compiles.**

- Unit test: "Does code execute?" — Eval: "Does AI say the right thing?"
- 16,000 unit tests can't catch one harmful response. 82 evals can.
- Thresholds: Safety 95%+, Pipeline 90%+, Quality 85%+
- Grading: DIFFERENT model, DIFFERENT provider as grader

### 6. Safety Layer Insertion

**Five insertion points in every production AI pipeline:**

1. INPUT GATE — Kill switch, rate limiting, injection detection
2. PRE-PROCESSING — PII handling, content classification (cheap model)
3. OUTPUT VALIDATION — Policy checks, hallucination detection, repair loop (max 2)
4. DELIVERY — Crisis detection (inject resources), consent-filtered output
5. POST-FLIGHT — Immutable Event logging, feedback collection

**Context architecture matters.** LLMs read top-down. Primary evidence must come first in the context window, supporting data second. Evidence placed at position 35 of 35 was ignored; moved to position 1, it was used immediately.

**Filter noise from context.** Generic search terms ("instances", "behavior") return irrelevant results that drown real evidence. Filter common words before searching. Cap text fields (200 chars for impact assessments, 500 for snippets).

Minimum viable: Kill switch + input filter + crisis resources (1-2 days).

### 7. Consent Minimalism

Consent is a boolean per domain per user. Audit trail in Event table. Domains are constants, not a table. Sharing levels are a column, not a model.

### 8. Frontend Architecture

Decision matrix:
- Real-time updates? → SPA (React)
- Complex client state? → SPA
- SEO critical? → Server-rendered
- Form → result flow? → Server-rendered

Conventions: No copy-paste. Components never call API. Components derive own state. Optimistic updates. React.memo on list items. Stable keys. Providers update in-place.

**Chart data from database, not LLM.** When visualizing numbers (budgets, enrollment, trends), pull data deterministically from the database. LLMs hallucinate numbers. Charts need exact data.

### 9. Design Philosophy

> "Would I want this for someone I love?"

For social services: serves people in crisis — housing, job loss, food insecurity, reentry.
For civic tech: "Would this help a single mother working two jobs understand what her government is doing?"

**Grace. Redemption. Dignity. Service.**

## RAG Architecture (for any LLM + search system)

**Chunk before you embed.** A single embedding for a 200K-char document hides the signal. A 30-second moment of rudeness in a 3-hour meeting is invisible in a meeting-level embedding.

The fix: 400-word chunks with 100-word overlap. 15,310 chunks vs 327 meeting-level embeddings. Each chunk's embedding represents what that paragraph is actually about.

| Level | Vectors | Finds | Misses |
|---|---|---|---|
| Document-level | ~300 | "Budget meeting" | "The paragraph about bullying" |
| Paragraph-level | ~15,000 | "The exact moment someone said it" | Very little |

**Use HNSW indexes** for >10K vectors. IVFFlat needs maintenance_work_mem that exceeds free-tier limits. HNSW builds incrementally and is more accurate.

**RPC functions for server-side snippet extraction.** Don't return full documents to the client. Write a database function that finds the keyword and returns 600 chars centered on the match.

## Peter Mode Checklist

### Before creating a new service/job/module
```
□ Who calls this? (Nobody → don't build it)
□ Call site written in caller already?
□ Integration test from entry point through service?
```

### Before creating a new model/table
```
□ Is this an event? → Event table
□ State transitions? → No? → JSONB or Event
□ Anything belongs_to it? → No? → JSONB on parent
□ >10K rows in 2 years? → No? → Constants/YAML
□ Code need or domain language? → Challenge it
```

### Before any security-sensitive code
```
□ How could an attacker abuse this?
□ return after every auth denial?
□ All queries scoped to current user/org?
□ All user input sanitized before DB/LLM/filesystem?
□ Kill switch still works?
```

### Before any new AI agent/feature
```
□ 30-Minute Rule: Am I debugging or should I switch tools?
□ Purpose-built tool exists? (Whisper, Tesseract, pdfplumber?)
□ Does the LLM actually follow instructions for this task?
□ What model tier? (frontier/default/small/nano)
□ Does user read this output?
□ Eval cases written BEFORE the feature?
□ All 5 safety insertion points present?
□ max_tokens set appropriately?
□ Context ordered with primary evidence first?
□ Long documents chunked before embedding? (400 words, 100 overlap)
```

### Before choosing frontend architecture
```
□ Real-time? → SPA
□ SEO? → Server-rendered
□ Form → result? → Server-rendered
□ Complex client state? → SPA
□ Charts needed? → Data from DB, not LLM
```

## The Proof

| Metric | Before | After (Peter Mode) |
|---|---|---|
| Models | 535 | 27 |
| Services | 1,013 | ~40 |
| Controllers | 392 | ~30 |
| Jobs | 212 | ~10 |
| Unreachable services | 79 (7.8%) | 0 |
| Orphaned jobs | 76 (37.4%) | 0 |
| Eval coverage | 0 | 82 evals + 237 validation tests |
