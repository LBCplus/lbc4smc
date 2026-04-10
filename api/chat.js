export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "Question required" });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_KEY) {
    return res.status(500).json({ error: "Server config incomplete" });
  }

  const h = { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY };
  const base = SUPABASE_URL + "/rest/v1/";

  async function safeFetch(url) {
    try {
      var r = await fetch(url, { headers: h });
      var d = await r.json();
      return Array.isArray(d) ? d : [];
    } catch(e) { return []; }
  }

  try {
    const stop = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","was","are","were","been","has","have","had","do","does","did","will","would","could","should","may","might","can","how","what","when","where","who","which","that","this","these","those","about","most","recent","last","latest","first","all","any","each","every","many","much","some","more","other","into"]);
    const words = question.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 2 && !stop.has(w); });
    const sq = words.join("+");

    // === LEVEL 1 DATA SOURCES ===
    var recentMeetings = await safeFetch(base + "meetings?select=id,date,meeting_type,title,topics,extracted_data&order=date.desc&limit=10");
    var searchMeetings = [];
    if (sq) searchMeetings = await safeFetch(base + "meetings?select=id,date,meeting_type,title,topics,extracted_data&fts=fts." + encodeURIComponent(sq) + "&order=date.desc&limit=15");
    var votes = [];
    if (sq) votes = await safeFetch(base + "votes?select=meeting_date,motion_text,result,vote_yes,vote_no,vote_abstain,vote_absent,topic_tags&fts=fts." + encodeURIComponent(sq) + "&order=meeting_date.desc&limit=20");
    var decisions = [];
    if (sq) decisions = await safeFetch(base + "decisions?select=meeting_date,description,category,dollar_amount,topic_tags&fts=fts." + encodeURIComponent(sq) + "&order=meeting_date.desc&limit=20");
    var budgetDocs = [];
    if (sq) budgetDocs = await safeFetch(base + "budget_documents?select=fiscal_year,title,doc_type,extracted_data,key_findings,total_revenue,total_expenditures,personnel_costs,personnel_cost_percentage,fund_balance,enrollment_ftes&fts=fts." + encodeURIComponent(sq) + "&order=fiscal_year.desc&limit=10");
    var recentBudget = await safeFetch(base + "budget_documents?select=fiscal_year,title,doc_type,total_revenue,total_expenditures,personnel_costs,personnel_cost_percentage,fund_balance,enrollment_ftes,key_findings&order=fiscal_year.desc&limit=5");
    var policyDocs = [];
    if (sq) policyDocs = await safeFetch(base + "policy_documents?select=title,source,summary,impact_on_smc,source_url&fts=fts." + encodeURIComponent(sq) + "&limit=10");

    // === LEVEL 2 DATA SOURCES ===
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
    var enrollmentData = await safeFetch(base + "enrollment_data?select=academic_year,metric,value,unit,source&college=eq.Santa Monica College&order=academic_year.desc&limit=50");

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
    var context = "SANTA MONICA COLLEGE BOARD OF TRUSTEES — CIVIC TRANSPARENCY DATA\n";
    context += "Database: 448 meetings (1998-2026), 5,430 votes, 20,019 decisions, 72 budget documents, 46,518 CA bills indexed (5,338 education, 607 CC-relevant with impact assessments).\n\n";

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
    if (votes.length > 0) { context += "\n=== MATCHING VOTES ===\n"; for (var i = 0; i < Math.min(votes.length, 15); i++) { var v = votes[i]; context += v.meeting_date + ": " + v.motion_text + " -> " + v.result; if (v.vote_yes && v.vote_yes.length) context += " | Yes: " + v.vote_yes.join(", "); if (v.vote_no && v.vote_no.length) context += " | No: " + v.vote_no.join(", "); context += "\n"; } }
    if (decisions.length > 0) { context += "\n=== MATCHING DECISIONS ===\n"; for (var i = 0; i < Math.min(decisions.length, 15); i++) { var d = decisions[i]; context += d.meeting_date + ": " + d.description; if (d.dollar_amount) context += " ($" + Number(d.dollar_amount).toLocaleString() + ")"; if (d.category) context += " [" + d.category + "]"; context += "\n"; } }
    if (allBudget.length > 0) { context += "\n=== BUDGET DOCUMENTS ===\n"; for (var i = 0; i < Math.min(allBudget.length, 10); i++) { var b = allBudget[i]; context += b.fiscal_year + ": " + b.title + "\n"; if (b.total_revenue) context += "  Revenue: $" + Number(b.total_revenue).toLocaleString() + "\n"; if (b.total_expenditures) context += "  Expenditures: $" + Number(b.total_expenditures).toLocaleString() + "\n"; if (b.personnel_costs) { context += "  Personnel Costs: $" + Number(b.personnel_costs).toLocaleString(); if (b.personnel_cost_percentage) context += " (" + b.personnel_cost_percentage + "%)"; context += "\n"; } if (b.fund_balance) context += "  Fund Balance: $" + Number(b.fund_balance).toLocaleString() + "\n"; if (b.enrollment_ftes) context += "  Enrollment FTES: " + Number(b.enrollment_ftes).toLocaleString() + "\n"; if (b.key_findings && b.key_findings.length) context += "  Key Findings: " + b.key_findings.join("; ") + "\n"; } }
    if (policyDocs.length > 0) { context += "\n=== POLICY DOCUMENTS ===\n"; for (var i = 0; i < Math.min(policyDocs.length, 8); i++) { var p = policyDocs[i]; context += p.title + " (Source: " + (p.source || "unknown") + ")\n"; if (p.summary) context += "  Summary: " + p.summary + "\n"; if (p.impact_on_smc) context += "  Impact: " + p.impact_on_smc.substring(0, 500) + "\n"; } }

    // === LEVEL 2 CONTEXT ===
    if (allLegislation.length > 0) {
      context += "\n=== CALIFORNIA LEGISLATION ===\n";
      for (var i = 0; i < Math.min(allLegislation.length, 12); i++) {
        var l = allLegislation[i];
        context += l.bill_number + " (" + l.session + "): " + (l.title || l.description || "") + "\n";
        context += "  Author: " + (l.author || "unknown") + " | Status: " + (l.status || "unknown");
        if (l.signed_date) context += " | Signed: " + l.signed_date;
        context += "\n";
        if (l.impact_assessment) { var ia = l.impact_assessment;
          if (ia.impact_on_community_colleges) context += "  Impact on CCs: " + ia.impact_on_community_colleges + "\n";
          if (ia.impact_on_smc) context += "  Impact on SMC: " + ia.impact_on_smc + "\n";
          if (ia.funding_implications) context += "  Funding: " + ia.funding_implications + "\n";
          if (ia.scff_relevance && ia.scff_relevance !== "Not directly related to SCFF.") context += "  SCFF relevance: " + ia.scff_relevance + "\n";
          if (ia.causal_connections) context += "  Causal connections: " + ia.causal_connections + "\n";
        }
        if (l.related_bills && l.related_bills.length) context += "  Related bills: " + l.related_bills.join(", ") + "\n";
      }
    }
    if (enrollmentData.length > 0) {
      context += "\n=== SMC ENROLLMENT & OUTCOME DATA ===\n";
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

    // === SYSTEM PROMPT ===
    var systemPrompt = "You are MyLocalBoard, a civic transparency AI for Santa Monica College Board of Trustees public records. Answer using ONLY the data below.\n\n";
    systemPrompt += "RULES:\n- Cite specific meeting dates, budget document fiscal years, or bill numbers for every claim\n- Include trustee vote breakdowns when available\n- If data is insufficient, say so honestly\n- Include dollar amounts when discussing budget items\n- Current trustees (Dec 2025-Dec 2026): Chair Dr. Sion Roy, Vice Chair Dr. Tom Peters, Dr. Nancy Greenstein, Dr. Margaret Quinones-Perez, Dr. Luis Barrera Castanon (appointed Feb 2025), Rob Rader, Anastasia Foster (elected Nov 2024)\n- Write in plain text paragraphs. Do NOT use markdown like ** or ## or bullet points.\n- End with a line listing the meeting dates, budget documents, or legislation referenced.\n\n";
    systemPrompt += "LEVEL 2 — POLICY INTELLIGENCE:\nYou have access to 46,518 California bills (2009-2026), 5,338 education-tagged, 607 CC-relevant with impact assessments, SMC enrollment trends, and CCCCO policy documents.\n\n";
    systemPrompt += "WHEN ANSWERING 'WHY' QUESTIONS, TRACE THE CAUSAL CHAIN:\n1. LEGISLATION: What state law created the policy framework? Cite bill number.\n2. IMPLEMENTATION: How did CCCCO translate this into requirements?\n3. INSTITUTIONAL RESPONSE: What did the board decide? Cite meeting date.\n4. BUDGET IMPACT: Where do the dollars show the result? Cite fiscal year and amount.\n5. OUTCOME: What happened to students, enrollment, or financial stability?\n\n";
    systemPrompt += "NEUTRALITY (CRITICAL):\n- Present DATA and CITATIONS, never opinions or characterizations\n- WRONG: 'The board failed to invest in workforce development'\n- RIGHT: 'The FY2023-24 Adopted Budget shows $0 in unrestricted general fund investment in workforce development or career technical education'\n- The reader draws their own conclusions. You provide the evidence.\n\n";
    systemPrompt += "PLAIN LANGUAGE:\n- Define every acronym on first use\n- Lead with impact, then explain mechanism\n- Use concrete numbers, not abstractions\n- Connect policy to daily life when possible\n\n";
    systemPrompt += "DISCLOSURE: End every answer that uses legislation or policy data with:\n'This analysis is generated by MyLocalBoard from public records and California state legislation. It reflects data, not editorial opinion.'\n\n";
    systemPrompt += context;

    var geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_KEY,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: question }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.3, maxOutputTokens: 8192 } })
      }
    );
    var geminiData = await geminiRes.json();
    if (geminiData.error) return res.status(500).json({ error: geminiData.error.message });
    var answer = "I couldn't generate a response.";
    if (geminiData.candidates && geminiData.candidates[0] && geminiData.candidates[0].content && geminiData.candidates[0].content.parts && geminiData.candidates[0].content.parts[0]) { answer = geminiData.candidates[0].content.parts[0].text; }

    return res.status(200).json({
      answer: answer,
      sources: { meetings_found: allMeetings.length, votes_found: votes.length, decisions_found: decisions.length, budget_docs_found: allBudget.length, legislation_found: allLegislation.length, enrollment_records: enrollmentData.length, policy_docs_found: policyDocs.length }
    });
  } catch (err) {
    console.error("MyLocalBoard API error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
