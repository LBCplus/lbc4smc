export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { question, board } = req.body;
  if (!question) return res.status(400).json({ error: "Question required" });

  const boardId = board || "smc";  // Default to SMC for backward compatibility

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
    return res.status(500).json({ error: "Server config incomplete" });
  }

  const h = { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY };
  const base = SUPABASE_URL + "/rest/v1/";
  const bf = "&board_id=eq." + encodeURIComponent(boardId);  // Board filter for all queries

  async function safeFetch(url) {
    try {
      var r = await fetch(url, { headers: h });
      var d = await r.json();
      return Array.isArray(d) ? d : [];
    } catch(e) { return []; }
  }

  async function getEmbedding(text) {
    if (!OPENAI_KEY) return null;
    try {
      var r = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Authorization": "Bearer " + OPENAI_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "text-embedding-3-small", input: text.substring(0, 8000) })
      });
      var d = await r.json();
      return d.data && d.data[0] ? d.data[0].embedding : null;
    } catch(e) { return null; }
  }

  try {
    var startTime = Date.now();

    // Load board config
    var boardConfig = await safeFetch(base + "boards?id=eq." + encodeURIComponent(boardId) + "&limit=1");
    var boardName = (boardConfig[0] && boardConfig[0].name) || "Local Board";
    var boardCity = (boardConfig[0] && boardConfig[0].city) || "";
    var boardShort = (boardConfig[0] && boardConfig[0].short_name) || boardId.toUpperCase();

    const stop = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","was","are","were","been","has","have","had","do","does","did","will","would","could","should","may","might","can","how","what","when","where","who","which","that","this","these","those","about","most","recent","last","latest","first","all","any","each","every","many","much","some","more","other","into"]);
    const words = question.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 2 && !stop.has(w); });
    const sq = words.join("+");

    // === LEVEL 1 DATA SOURCES (filtered by board) ===
    var recentMeetings = await safeFetch(base + "meetings?select=id,date,meeting_type,title,topics,extracted_data&order=date.desc&limit=10" + bf);
    var searchMeetings = [];
    if (sq) searchMeetings = await safeFetch(base + "meetings?select=id,date,meeting_type,title,topics,extracted_data&fts=fts." + encodeURIComponent(sq) + "&order=date.desc&limit=15" + bf);
    var votes = [];
    if (sq) votes = await safeFetch(base + "votes?select=meeting_date,motion_text,result,vote_yes,vote_no,vote_abstain,vote_absent,topic_tags&fts=fts." + encodeURIComponent(sq) + "&order=meeting_date.desc&limit=20" + bf);
    var decisions = [];
    if (sq) decisions = await safeFetch(base + "decisions?select=meeting_date,description,category,dollar_amount,topic_tags&fts=fts." + encodeURIComponent(sq) + "&order=meeting_date.desc&limit=20" + bf);
    var budgetDocs = [];
    if (sq) budgetDocs = await safeFetch(base + "budget_documents?select=fiscal_year,title,doc_type,extracted_data,key_findings,total_revenue,total_expenditures,personnel_costs,personnel_cost_percentage,fund_balance,enrollment_ftes&fts=fts." + encodeURIComponent(sq) + "&order=fiscal_year.desc&limit=10" + bf);
    var recentBudget = await safeFetch(base + "budget_documents?select=fiscal_year,title,doc_type,total_revenue,total_expenditures,personnel_costs,personnel_cost_percentage,fund_balance,enrollment_ftes,key_findings&order=fiscal_year.desc&limit=5" + bf);
    var policyDocs = [];
    if (sq) policyDocs = await safeFetch(base + "policy_documents?select=title,source,summary,impact_on_smc,source_url&fts=fts." + encodeURIComponent(sq) + "&limit=10" + bf);

    // === LEVEL 2 DATA SOURCES (legislation is statewide, no board filter) ===
    var legislation = [];
    if (sq) legislation = await safeFetch(base + "legislation?select=bill_number,session,title,description,author,status,signed_date,summary,subject_tags,impact_assessment,related_bills,code_sections&fts=fts." + encodeURIComponent(sq) + "&is_education=eq.true&order=signed_date.desc.nullslast&limit=15");

    var billNumberMatch = question.match(/\b(AB|SB|ACA|SCA)\s*(\d+)\b/i);
    var billByNumber = [];
    if (billNumberMatch) {
      var bn = billNumberMatch[1].toUpperCase() + billNumberMatch[2];
      billByNumber = await safeFetch(base + "legislation?select=bill_number,session,title,description,author,status,signed_date,summary,subject_tags,impact_assessment,related_bills,code_sections&bill_number=eq." + encodeURIComponent(bn) + "&limit=5");
      if (billByNumber.length === 0) {
        bn = billNumberMatch[1].toUpperCase() + " " + billNumberMatch[2];
        billByNumber = await safeFetch(base + "legislation?select=bill_number,session,title,description,author,status,signed_date,summary,subject_tags,impact_assessment,related_bills,code_sections&bill_number=eq." + encodeURIComponent(bn) + "&limit=5");
      }
    }

    var ccLegislation = await safeFetch(base + "legislation?select=bill_number,session,title,status,signed_date,impact_assessment&is_cc_relevant=eq.true&status=eq.signed&impact_assessment=not.is.null&order=signed_date.desc.nullslast&limit=10");
    var enrollmentData = await safeFetch(base + "enrollment_data?select=academic_year,metric,value,unit,source&order=academic_year.desc&limit=50" + bf);

    // === TRANSCRIPT SEARCH (RPC with relevant snippets) ===
    var transcripts = [];
    if (words.length > 0) {
      var commonWords = new Set(["board","meeting","meetings","college","santa","monica","trustee","trustees","school","year","years","last","time"]);
      for (var wi = 0; wi < Math.min(words.length, 4); wi++) {
        if (commonWords.has(words[wi])) continue;
        if (["instances","behavior","behavior","example","regarding","including","related","general","specific","question","answer","issue","issues","concern","concerns","discuss","discussion","information","provide","provided","describe","address"].indexOf(words[wi]) >= 0) continue;
        try {
          var tr = await fetch(base + "rpc/search_transcripts", {
            method: "POST", headers: { ...h, "Content-Type": "application/json" },
            body: JSON.stringify({ search_term: words[wi].substring(0, Math.min(words[wi].length, 8)), board: boardId, result_limit: 3 })
          });
          var td = await tr.json();
          if (Array.isArray(td)) {
            for (var ti = 0; ti < td.length; ti++) {
              var exists = false;
              for (var si = 0; si < transcripts.length; si++) { if (transcripts[si].date === td[ti].date) { exists = true; break; } }
              if (!exists) transcripts.push(td[ti]);
            }
          }
        } catch(e) {}
      }
      transcripts = transcripts.slice(0, 10);
    }
    // === LAYER 3: SEMANTIC SEARCH (filtered by board) ===
    var semanticMeetings = [];
    var semanticDecisions = [];
    var semanticLegislation = [];
    var semanticPolicyDocs = [];

    var questionEmbedding = await getEmbedding(question);
    if (questionEmbedding) {
      try {
        var sr1 = await fetch(base + "rpc/match_meetings", {
          method: "POST", headers: { ...h, "Content-Type": "application/json" },
          body: JSON.stringify({ query_embedding: questionEmbedding, match_threshold: 0.25, match_count: 5, filter_board: boardId })
        });
        var sd1 = await sr1.json();
        if (Array.isArray(sd1)) semanticMeetings = sd1;
      } catch(e) {}

      try {
        var sr2 = await fetch(base + "rpc/match_decisions", {
          method: "POST", headers: { ...h, "Content-Type": "application/json" },
          body: JSON.stringify({ query_embedding: questionEmbedding, match_threshold: 0.25, match_count: 10, filter_board: boardId })
        });
        var sd2 = await sr2.json();
        if (Array.isArray(sd2)) semanticDecisions = sd2;
      } catch(e) {}

      try {
        var sr3 = await fetch(base + "rpc/match_legislation", {
          method: "POST", headers: { ...h, "Content-Type": "application/json" },
          body: JSON.stringify({ query_embedding: questionEmbedding, match_threshold: 0.25, match_count: 5 })
        });
        var sd3 = await sr3.json();
        if (Array.isArray(sd3)) semanticLegislation = sd3;
      } catch(e) {}

      try {
        var sr4 = await fetch(base + "rpc/match_policy_docs", {
          method: "POST", headers: { ...h, "Content-Type": "application/json" },
          body: JSON.stringify({ query_embedding: questionEmbedding, match_threshold: 0.25, match_count: 5, filter_board: boardId })
        });
        var sd4 = await sr4.json();
        if (Array.isArray(sd4)) semanticPolicyDocs = sd4;
      } catch(e) {}
    }

    // === MERGE AND DEDUPLICATE ===
    var seenDates = {};
    var allMeetings = [];
    var combined = searchMeetings.concat(recentMeetings);
    for (var i = 0; i < combined.length; i++) { var m = combined[i]; var key = m.date + "_" + m.meeting_type; if (!seenDates[key]) { seenDates[key] = true; allMeetings.push(m); } }
    allMeetings.sort(function(a, b) { return b.date.localeCompare(a.date); });

    var seenBudget = {};
    var allBudget = [];
    var combinedBudget = budgetDocs.concat(recentBudget);
    for (var i = 0; i < combinedBudget.length; i++) { var b = combinedBudget[i]; var bkey = b.fiscal_year + "_" + b.title; if (!seenBudget[bkey]) { seenBudget[bkey] = true; allBudget.push(b); } }

    var seenBills = {};
    var allLegislation = [];
    var combinedLeg = billByNumber.concat(legislation).concat(ccLegislation);
    for (var i = 0; i < combinedLeg.length; i++) { var l = combinedLeg[i]; var lkey = l.bill_number + "_" + l.session; if (!seenBills[lkey]) { seenBills[lkey] = true; allLegislation.push(l); } }

    // === BUILD CONTEXT ===
    var context = boardName.toUpperCase() + " — CIVIC TRANSPARENCY DATA\n";
    context += "Board: " + boardName + " (" + boardCity + ")\n\n";

    // Transcripts (PRIMARY EVIDENCE — placed first)
    if (transcripts.length > 0) {
      context += "=== MEETING TRANSCRIPTS (actual words spoken at meetings) ===\n";
      for (var i = 0; i < Math.min(transcripts.length, 10); i++) {
        var t = transcripts[i];
        var snippet = t.snippet || (t.raw_minutes_text || "").substring(0, 500);
        context += "\n" + t.date + " (" + (t.meeting_type || "meeting") + "):\n" + snippet + "\n";
      }
    }

    // Meetings
    if (allMeetings.length > 0) {
      context += "=== MEETINGS ===\n";
      for (var i = 0; i < Math.min(allMeetings.length, 12); i++) {
        var m = allMeetings[i]; context += "\nDate: " + m.date + " | Type: " + m.meeting_type + " | Topics: " + (m.topics || []).join(", ") + "\n";
        if (m.extracted_data) { var ed = m.extracted_data;
          if (ed.votes && ed.votes.length) { context += "Votes:\n"; for (var j = 0; j < Math.min(ed.votes.length, 6); j++) { var v = ed.votes[j]; context += "  - " + v.motion_text + " -> " + v.result; if (v.vote_yes && v.vote_yes.length) context += " (Yes: " + v.vote_yes.join(", ") + ")"; if (v.vote_no && v.vote_no.length) context += " (No: " + v.vote_no.join(", ") + ")"; context += "\n"; } }
          if (ed.decisions && ed.decisions.length) { context += "Decisions:\n"; for (var j = 0; j < Math.min(ed.decisions.length, 6); j++) { var d = ed.decisions[j]; context += "  - " + d.description; if (d.dollar_amount) context += " ($" + Number(d.dollar_amount).toLocaleString() + ")"; context += "\n"; } }
          if (ed.trustee_statements && ed.trustee_statements.length) { context += "Trustee Statements:\n"; for (var j = 0; j < Math.min(ed.trustee_statements.length, 4); j++) { var s = ed.trustee_statements[j]; context += "  - " + s.trustee_name + ": " + s.summary + "\n"; } }
        }
      }
    }

    // Votes
    if (votes.length > 0) { context += "\n=== MATCHING VOTES ===\n"; for (var i = 0; i < Math.min(votes.length, 15); i++) { var v = votes[i]; context += v.meeting_date + ": " + v.motion_text + " -> " + v.result; if (v.vote_yes && v.vote_yes.length) context += " | Yes: " + v.vote_yes.join(", "); if (v.vote_no && v.vote_no.length) context += " | No: " + v.vote_no.join(", "); context += "\n"; } }

    // Decisions
    if (decisions.length > 0) { context += "\n=== MATCHING DECISIONS ===\n"; for (var i = 0; i < Math.min(decisions.length, 15); i++) { var d = decisions[i]; context += d.meeting_date + ": " + d.description; if (d.dollar_amount) context += " ($" + Number(d.dollar_amount).toLocaleString() + ")"; if (d.category) context += " [" + d.category + "]"; context += "\n"; } }

    // Budget documents
    if (allBudget.length > 0) { context += "\n=== BUDGET DOCUMENTS ===\n"; for (var i = 0; i < Math.min(allBudget.length, 10); i++) { var b = allBudget[i]; context += b.fiscal_year + ": " + b.title + "\n"; if (b.total_revenue) context += "  Revenue: $" + Number(b.total_revenue).toLocaleString() + "\n"; if (b.total_expenditures) context += "  Expenditures: $" + Number(b.total_expenditures).toLocaleString() + "\n"; if (b.personnel_costs) { context += "  Personnel Costs: $" + Number(b.personnel_costs).toLocaleString(); if (b.personnel_cost_percentage) context += " (" + b.personnel_cost_percentage + "%)"; context += "\n"; } if (b.fund_balance) context += "  Fund Balance: $" + Number(b.fund_balance).toLocaleString() + "\n"; if (b.enrollment_ftes) context += "  Enrollment FTES: " + Number(b.enrollment_ftes).toLocaleString() + "\n"; if (b.key_findings && b.key_findings.length) context += "  Key Findings: " + b.key_findings.join("; ") + "\n"; } }

    // Policy documents
    if (policyDocs.length > 0) { context += "\n=== POLICY DOCUMENTS ===\n"; for (var i = 0; i < Math.min(policyDocs.length, 8); i++) { var p = policyDocs[i]; context += p.title + " (Source: " + (p.source || "unknown") + ")\n"; if (p.summary) context += "  Summary: " + p.summary + "\n"; if (p.impact_on_smc) context += "  Impact: " + p.impact_on_smc.substring(0, 500) + "\n"; } }

    // === LEVEL 2 CONTEXT ===
    if (allLegislation.length > 0) {
      context += "\n=== CALIFORNIA LEGISLATION ===\n";
      for (var i = 0; i < Math.min(allLegislation.length, 6); i++) {
        var l = allLegislation[i];
        context += l.bill_number + " (" + l.session + "): " + (l.title || l.description || "") + "\n";
        context += "  Author: " + (l.author || "unknown") + " | Status: " + (l.status || "unknown");
        if (l.signed_date) context += " | Signed: " + l.signed_date;
        context += "\n";
        if (l.impact_assessment) { var ia = l.impact_assessment;
          if (ia.impact_on_community_colleges) context += "  Impact on CCs: " + ia.impact_on_community_colleges.substring(0, 200) + "\n";
          if (ia.impact_on_smc) context += "  Impact on SMC: " + ia.impact_on_smc.substring(0, 200) + "\n";
          if (ia.funding_implications) context += "  Funding: " + ia.funding_implications + "\n";
          if (ia.scff_relevance && ia.scff_relevance !== "Not directly related to SCFF.") context += "  SCFF relevance: " + ia.scff_relevance + "\n";
          if (ia.causal_connections) context += "  Causal connections: " + ia.causal_connections.substring(0, 200) + "\n";
        }
        if (l.related_bills && l.related_bills.length) context += "  Related bills: " + l.related_bills.join(", ") + "\n";
      }
    }

    // Enrollment data
    if (enrollmentData.length > 0) {
      context += "\n=== ENROLLMENT & OUTCOME DATA ===\n";
      var byMetric = {};
      for (var i = 0; i < enrollmentData.length; i++) { var e = enrollmentData[i]; if (!byMetric[e.metric]) byMetric[e.metric] = []; byMetric[e.metric].push(e); }
      for (var metric in byMetric) {
        context += metric + ": ";
        var pts = byMetric[metric].sort(function(a,b) { return a.academic_year.localeCompare(b.academic_year); });
        var ptStrs = [];
        for (var i = 0; i < pts.length; i++) { var p = pts[i]; var val = p.unit === "dollars" ? "$" + Number(p.value).toLocaleString() : (p.unit === "percentage" ? p.value + "%" : Number(p.value).toLocaleString()); ptStrs.push(p.academic_year + "=" + val); }
        context += ptStrs.join(", ") + " (Source: " + (byMetric[metric][0].source || "CCCCO") + ")\n";
      }
    }

    // === LAYER 3: SEMANTIC RESULTS ===
    if (semanticMeetings.length > 0 || semanticDecisions.length > 0 || semanticLegislation.length > 0 || semanticPolicyDocs.length > 0) {
      context += "\n=== SEMANTIC SEARCH (meaning-based) ===\n";
      if (semanticMeetings.length > 0) {
        context += "\nRelated meeting transcripts:\n";
        for (var i = 0; i < semanticMeetings.length; i++) { var sm = semanticMeetings[i]; var ft = (sm.raw_minutes_text || ""); var sn = ""; for (var wi = 0; wi < Math.min(words.length, 3); wi++) { var si = ft.toLowerCase().indexOf(words[wi].substring(0, Math.min(words[wi].length, 6))); if (si > 0) { sn = ft.substring(Math.max(0, si - 100), si + 400); break; } } if (!sn) sn = ft.substring(0, 400); context += sm.date + " (" + sm.meeting_type + ") [" + (sm.similarity * 100).toFixed(0) + "%]: " + sn + "\n"; }
      }
      if (semanticDecisions.length > 0) {
        context += "\nRelated decisions:\n";
        for (var i = 0; i < Math.min(semanticDecisions.length, 8); i++) { var sd = semanticDecisions[i]; context += sd.meeting_date + ": " + sd.description; if (sd.dollar_amount) context += " ($" + Number(sd.dollar_amount).toLocaleString() + ")"; context += " [" + (sd.similarity * 100).toFixed(0) + "%]\n"; }
      }
      if (semanticLegislation.length > 0) {
        context += "\nRelated legislation:\n";
        for (var i = 0; i < semanticLegislation.length; i++) { var sl = semanticLegislation[i]; context += sl.bill_number + " (" + sl.session + "): " + (sl.title || sl.summary || "").substring(0, 200) + " [" + (sl.similarity * 100).toFixed(0) + "%]\n"; }
      }
      if (semanticPolicyDocs.length > 0) {
        context += "\nRelated policy documents:\n";
        for (var i = 0; i < semanticPolicyDocs.length; i++) { var sp = semanticPolicyDocs[i]; context += sp.title + ": " + (sp.summary || "").substring(0, 300) + " [" + (sp.similarity * 100).toFixed(0) + "%]\n"; }
      }
    }

    // === SYSTEM PROMPT ===
    var systemPrompt = "You are MyLocalBoard, a civic transparency AI for " + boardName + " public records. Answer using ONLY the data below.\n\n";
    systemPrompt += "RULES:\n- Cite specific meeting dates, budget document fiscal years, or bill numbers for every claim\n- Include vote breakdowns when available\n- If data is insufficient, say so honestly\n- Include dollar amounts when discussing budget items\n- Write in plain text paragraphs. Do NOT use markdown like ** or ## or bullet points.\n- End with a line listing the meeting dates, budget documents, or legislation referenced.\n\n";
    systemPrompt += "LEVEL 2 — POLICY INTELLIGENCE:\nYou have access to California state legislation, enrollment trends, and policy documents.\n\n";
    systemPrompt += "WHEN ANSWERING 'WHY' QUESTIONS, TRACE THE CAUSAL CHAIN:\n1. LEGISLATION: What state law created the policy framework? Cite bill number.\n2. IMPLEMENTATION: How was this translated into requirements?\n3. INSTITUTIONAL RESPONSE: What did the board decide? Cite meeting date.\n4. BUDGET IMPACT: Where do the dollars show the result? Cite fiscal year and amount.\n5. OUTCOME: What happened to students, enrollment, or financial stability?\n\n";
    systemPrompt += "NEUTRALITY (CRITICAL):\n- Present DATA and CITATIONS, never opinions or characterizations\n- The reader draws their own conclusions. You provide the evidence.\n\n";
    systemPrompt += "PLAIN LANGUAGE:\n- Define every acronym on first use\n- Lead with impact, then explain mechanism\n- Use concrete numbers, not abstractions\n\n";
    systemPrompt += "TRANSCRIPTS ARE PRIMARY EVIDENCE: When meeting transcripts are provided, they contain the actual words spoken at meetings. Prioritize transcript evidence over meeting summaries. If a transcript shows someone using words like disrespect, bully, hostile, rude, or inappropriate, REPORT IT with the exact quote and date.\n\n";
    systemPrompt += "LAYER 3 — SEMANTIC SEARCH: You may receive results from semantic (meaning-based) search. Use them when relevant, even if they do not share exact words with the query.\n\n";
    systemPrompt += "DISCLOSURE: End every answer that uses legislation or policy data with:\n'This analysis is generated by MyLocalBoard from public records and California state legislation. It reflects data, not editorial opinion.'\n\n";
    systemPrompt += context;

    var openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + OPENAI_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.3,
        max_tokens: 4096
      })
    });
    var openaiData = await openaiRes.json();
    if (openaiData.error) return res.status(500).json({ error: openaiData.error.message });
    var answer = "I couldn't generate a response.";
    if (openaiData.choices && openaiData.choices[0] && openaiData.choices[0].message) { answer = openaiData.choices[0].message.content; }

    // === QUESTION INTELLIGENCE: Log every question ===
    var responseTime = Date.now() - startTime;
    var sourceCounts = {
      meetings: allMeetings.length, votes: votes.length, decisions: decisions.length,
      budget: allBudget.length, legislation: allLegislation.length,
      semantic_meetings: semanticMeetings.length, semantic_decisions: semanticDecisions.length
    };
    var hadResults = allMeetings.length > 0 || votes.length > 0 || decisions.length > 0 || allBudget.length > 0;
    var hadSemantic = semanticMeetings.length > 0 || semanticDecisions.length > 0 || semanticLegislation.length > 0;

    // Simple topic detection from keywords
    var topicMap = {
      budget: /budget|fund|revenue|expenditure|deficit|fiscal|financial/i,
      personnel: /salary|personnel|staff|employee|hire|layoff|union|contract|compensation/i,
      enrollment: /enrollment|student|ftes|headcount|attendance|registration/i,
      facilities: /building|campus|construction|master.?plan|bond|measure/i,
      governance: /board|trustee|vote|policy|resolution|motion|agenda/i,
      equity: /equity|diversity|inclusion|dei|access|underrepresented/i,
      safety: /safety|police|security|emergency|threat/i,
      academics: /program|curriculum|degree|transfer|course|accreditation/i,
      legislation: /bill|law|legislation|ab\s?\d|sb\s?\d|scff|cola/i
    };
    var detectedTopics = [];
    for (var topic in topicMap) { if (topicMap[topic].test(question)) detectedTopics.push(topic); }

    // Fire-and-forget: don't block response on logging
    fetch(base + "questions", {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({
        board_id: boardId,
        question: question.substring(0, 1000),
        answer_snippet: answer.substring(0, 500),
        had_results: hadResults,
        had_semantic_results: hadSemantic,
        source_counts: sourceCounts,
        topic_tags: detectedTopics.length > 0 ? detectedTopics : null,
        response_time_ms: responseTime,
        error: false
      })
    }).catch(function() {});

    return res.status(200).json({
      answer: answer,
      board: boardId,
      sources: {
        meetings_found: allMeetings.length,
        votes_found: votes.length,
        decisions_found: decisions.length,
        budget_docs_found: allBudget.length,
        legislation_found: allLegislation.length,
        enrollment_records: enrollmentData.length,
        policy_docs_found: policyDocs.length,
        semantic_meetings: semanticMeetings.length,
        semantic_decisions: semanticDecisions.length,
        semantic_legislation: semanticLegislation.length, transcripts_found: transcripts.length
      }
    });
  } catch (err) {
    console.error("MyLocalBoard API error:", err);

    // Log errors too
    try {
      fetch(base + "questions", {
        method: "POST",
        headers: { ...h, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify({ board_id: boardId, question: question.substring(0, 1000), error: true })
      }).catch(function() {});
    } catch(e) {}

    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
