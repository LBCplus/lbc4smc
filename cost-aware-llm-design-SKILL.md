---
name: cost-aware-llm-design
description: "Use this skill when designing ANY LLM-powered feature, agent, or pipeline. Triggers on: 'add an AI agent', 'create a new agent', 'build with LLM', 'API cost', 'token usage', 'model selection', 'which model should', 'LLM pipeline', 'multi-agent', 'transcribe', 'OCR', 'extract text from', or any architecture that involves LLM API calls. Also trigger when reviewing existing LLM architectures for cost optimization. This skill prevents two failure modes: (1) routing every call to the most expensive model, and (2) using a general-purpose LLM for tasks that have purpose-built tools. A multi-agent system where every agent runs on the frontier model costs 10-40x more than one where only the user-facing conversation needs frontier quality. Using Gemini to transcribe audio instead of Whisper costs 10x more and fails with timeouts."
---

# Cost-Aware LLM Design

## The Three Rules (in order)

### Rule Zero: Purpose-Built Tools First

**Before reaching for an LLM, ask: "Does a purpose-built tool exist for this task?"**

If a task has a well-known, non-LLM solution that existed before 2020, use that solution.

| Task | Wrong (General LLM) | Right (Purpose-Built) | Impact |
|------|---------------------|----------------------|--------|
| Audio transcription | Gemini, Claude | OpenAI Whisper, Deepgram | 10x faster, no timeouts, speaker diarization |
| Document OCR | Claude Vision, Gemini | Tesseract, Google Document AI | Free/cheap, batch-capable, deterministic |
| PDF text extraction | "Read this PDF" to LLM | pdfplumber, PyPDF2 | Free, instant, no token cost |
| Code execution | "Run this code" to LLM | subprocess, exec | Deterministic, no hallucination |
| Geolocation | "What city is this zip?" | Geocoding API | Deterministic, cached |
| HTML parsing | LLM text extraction | BeautifulSoup, lxml | Free, deterministic, fast |
| Chart data | LLM generates numbers | Database query | Deterministic, no hallucination |

**Lesson learned:** 97 audio files sent to Gemini. Every one timed out (504). Three days wasted. Whisper processed them all in 3 hours for $12. The general-purpose LLM was the wrong tool.

### Rule One: Tool Fitness Over Tool Cost

**A tool that won't follow instructions is wrong regardless of price.**

Cost matters, but capability matters more. A cheaper model that refuses to do the job costs infinite debugging time.

**Lesson learned:** Gemini was cheaper than GPT-4o-mini for Q&A. But Gemini suppressed legitimate public record content — when transcripts contained words like "bullying" and "hostile environment" spoken at public government meetings, Gemini said "the data does not contain any instances." GPT-4o-mini reported the evidence immediately with exact quotes and dates.

We spent 2+ hours trying to fix Gemini — reordering context, adding system prompt instructions, filtering keywords, moving transcripts to the top. None of it worked. Switching to GPT-4o-mini fixed it in one deploy.

**The test:** If you've been tweaking prompts, reordering context, or adding instructions to get the LLM to do something it keeps refusing to do — the LLM is the wrong tool. Switch providers.

**Provider fitness by domain:**

| Domain | Watch For |
|--------|-----------|
| Civic transparency / public records | LLM must report uncomfortable facts without editorializing or suppressing |
| Healthcare / social services | LLM must handle crisis content without over-filtering |
| Legal / compliance | LLM must quote exact language, not paraphrase |
| Education | LLM must discuss difficult topics age-appropriately without avoidance |

### Rule Two: Right Tier for the Task

Only user-facing conversation needs frontier quality. Everything else is infrastructure.

| Tier | Use For | Cost Ratio |
|------|---------|------------|
| Frontier | User-facing conversation | 1x |
| Default | Structured JSON output | 10-12x cheaper |
| Small | Classification, binary decisions | 50-100x cheaper |
| Nano | Evals, grading, batch ops | Minimum cost |

## The 30-Minute Rule

**If the same approach has failed 3 times or you've been debugging for 30 minutes, STOP.**

Ask:
1. "Am I using the right tool?" (Rule Zero — maybe this isn't an LLM task at all)
2. "Am I using the right LLM?" (Rule One — maybe this provider can't do this)
3. "Am I using the right tier?" (Rule Two — maybe this needs frontier, not small)
4. "Am I using the right architecture?" (maybe the context is wrong, not the model)

The fix is almost never "add more instructions to the prompt." It's almost always "switch the tool."

## The Complete Decision Matrix

```
1. "Does this task have a purpose-built tool?"
   → Yes: Use that tool. STOP.
   → No: This task needs an LLM. Continue.

2. "Does the LLM follow instructions for this domain?"
   → No: Switch providers. Don't add more prompting.
   → Yes: Continue.

3. "Does the user read this output directly?"
   → Yes: Tier 1 (frontier)
   → No: Continue.

4. "Does this produce structured JSON or classification?"
   → Yes: Tier 2 or 3
   → No: Tier 2 (default)
```

## RAG Architecture: Chunk Before You Embed

**A single embedding for a long document hides the signal.**

A 200K-char meeting transcript has one 30-second moment of rudeness. A meeting-level embedding averages that moment with 3 hours of routine business. The embedding says "budget meeting." The paragraph says "bullying the faculty."

**The fix: Paragraph-level chunking.**

- 400-word chunks with 100-word overlap
- Each chunk gets its own embedding
- Semantic search finds the exact paragraph, not the meeting

| Level | Vectors | Finds |
|---|---|---|
| Document-level | ~300 | "Budget meeting" |
| Paragraph-level | ~15,000 | "The exact paragraph about bullying" |

**HNSW over IVFFlat** for indexes above 10K vectors. IVFFlat requires maintenance_work_mem that exceeds free-tier database limits. HNSW builds incrementally.

## Context Architecture

**LLMs read top-down. Put primary evidence first.**

We placed transcript evidence at position 35 of 35 context sections. GPT ignored it. Moved transcripts to position 1. GPT cited them immediately.

**Rules:**
1. Primary evidence (transcript excerpts, semantic chunks) → TOP of context
2. Supporting data (meeting summaries, vote records) → MIDDLE
3. Background data (legislation, enrollment trends) → BOTTOM
4. Filter generic keywords before searching — "instances" and "behavior" each returned 5 irrelevant results that drowned real evidence
5. Cap text fields — 200 chars for impact assessments, 500-600 chars for snippets
6. Server-side snippet extraction via RPC — don't return full documents and extract client-side

## Architecture: Config-Driven Model Selection

Never hardcode model names. Use tier resolution via config:

```yaml
# models.yaml
anthropic:
  models:
    frontier: claude-sonnet-4-6
    default: claude-haiku-4-5
openai:
  models:
    frontier: gpt-4o
    default: gpt-4o-mini
    small: gpt-4o-mini
google:
  models:
    default: gemini-flash
    small: gemini-flash-lite
    nano: gemini-flash-lite
```

When a cheaper model launches, update ONE file.

## The Provider Diversity Principle

Don't lock into one LLM provider. The architecture must support switching by config:
- Price-shop between providers
- Fail over during outages
- Switch when a provider's safety filters conflict with your domain
- A/B test quality across providers

## Pre-Flight Checklist

```
□ 30-Minute Rule: Am I debugging or should I switch tools?
□ Does this task have a purpose-built tool? (Whisper, Tesseract, pdfplumber?)
□ Does the LLM follow instructions for this specific domain?
□ If using an LLM: What tier? (frontier/default/small/nano)
□ Does the user directly read this output?
□ max_tokens set appropriately?
□ Long documents chunked before embedding? (400 words, 100 overlap)
□ Context ordered with primary evidence first?
□ Generic keywords filtered from search?
□ Chart/number data from database, not LLM?
□ Model specified by tier in config, not hardcoded?
```
