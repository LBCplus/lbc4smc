export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  var question = req.body && req.body.question;
  if (!question) return res.status(400).json({ error: "Question required" });

  var SUPABASE_URL = process.env.SUPABASE_URL;
  var SUPABASE_KEY = process.env.SUPABASE_KEY;
  var GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_KEY) {
    return res.status(500).json({ error: "Server config incomplete" });
  }

  var h = { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY };

  // Helper: safe fetch that never throws
  async function safeFetch(url) {
    try {
      var r = await fetch(url, { headers: h });
      var d = await r.json();
      return Array.isArray(d) ? d : [];
    } catch(e) { return []; }
  }

  try {
    // Build search terms
    var stopList = "the a an and or but in on at to for of with by from is was are were been has have had do does did will would could should may might can how what when where who which that this these those about most recent last latest first all any each every many much some more other into";
    var stop = {};
    stopList.split(" ").forEach(function(w) { stop[w] = true; });
    var words = question.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 2 && !stop[w]; });
    var sq = words.join("+");
    var base = SUPABASE_URL + "/rest/v1/";

    // ===== 1. MEETINGS (recent + search) =====
    var recentMeetings = await safeFetch(base + "meetings?select=id,date,meeting_type,title,topics,extracted_data&order=date.desc&limit=10");
    var searchMeetings = [];
    if (sq) { searchMeetings = await safeFetch(base + "meetings?select=id,date,meeting_type,title,topics,extracted_data&fts=fts." + encodeURIComponent(sq) + "&order=date.desc&limit=15"); }

    // Deduplicate meetings
    var seenM = {};
    var allMeetings = [];
    var combinedM = searchMeetings.concat(recentMeetings);
    for (var i = 0; i < combinedM.length; i++) {
      var mk = combinedM[i].date + "_" + combinedM[i].meeting_type;
      if (!seenM[mk]) { seenM[mk] = true; allMeetings.push(combinedM[i]); }
    }
    allMeetings.sort(function(a, b) { return b.date.localeCompare(a.date); });

    // ===== 2. VOTES (search) =====
    var votes = [];
    if (sq) { votes = await safeFetch(base + "votes?select=meeting_date,motion_text,result,vote_yes,vote_no,vote_abstain,vote_absent,topic_tags&fts=fts." + encodeURIComponent(sq) + "&order=meeting_date.desc&limit=20"); }

    // ===== 3. DECISIONS (search) =====
    var decisions = [];
    if (sq) { decisions = await safeFetch(base + "decisions?select=meeting_date,description,category,dollar_amount,topic_tags&fts=fts." + encodeURIComponent(sq) + "&order=meeting_date.desc&limit=20"); }

    // ===== 4. BUDGET DOCUMENTS (recent + search) =====
    var recentBudget = await safeFetch(base + "budget_documents?select=fiscal_year,title,doc_type,total_revenue,total_expenditures,personnel_costs,personnel_cost_percentage,fund_balance,enrollment_ftes,key_findings&order=fiscal_year.desc&limit=5");
    var searchBudget = [];
    if (sq) { searchBudget = await safeFetch(base + "budget_documents?select=fiscal_year,title,doc_type,total_revenue,total_expenditures,personnel_costs,personnel_cost_percentage,fund_balance,enrollment_ftes,key_findings,extracted_data&fts=fts." + encodeURIComponent(sq) + "&order=fiscal_year.desc&limit=10"); }

    // Deduplicate budget
    var seenB = {};
    var allBudget = [];
    var combinedB = searchBudget.concat(recentBudget);
    for (var i = 0; i < combinedB.length; i++) {
      var bk = combinedB[i].fiscal_year + "_" + combinedB[i].title;
      if (!seenB[bk]) { seenB[bk] = true; allBudget.push(combinedB[i]); }
    }

    // ===== 5. POLICY DOCUMENTS (search) =====
    var policyDocs = [];
    if (sq) { policyDocs = await safeFetch(base + "policy_documents?select=source,title,document_type,summary,impact_on_community_colleges,impact_on_smc,key_provisions,funding_implications,related_programs,topic_tags&fts=fts." + encodeURIComponent(sq) + "&order=created_at.desc&limit=10"); }

    // ===== BUILD CONTEXT =====
    var context = "SANTA MONICA COLLEGE — CIVICLENS DATABASE\n";
    context += "Contains: 349 board meetings (1998-2026), 2,656 votes, 9,819 decisions, 72 budget reports, 33+ policy documents (CA bills, CCCCO memos, EDGE publications).\n\n";

    // Meetings
    if (allMeetings.length > 0) {
      context += "=== BOARD MEETINGS ===\n";
      for (var i = 0; i < Math.min(allMeetings.length, 12); i++) {
        var m = allMeetings[i];
        context += "\nDate: " + m.date + " | Type: " + m.meeting_type + " | Topics: " + (m.topics || []).join(", ") + "\n";
        if (m.extracted_data) {
          var ed = m.extracted_data;
          if (ed.votes && ed.votes.length) {
            context += "Votes:\n";
            for (var j = 0; j < Math.min(ed.votes.length, 6); j++) {
              var v = ed.votes[j];
              context += "  - " + v.motion_text + " -> " + v.result;
              if (v.vote_yes && v.vote_yes.length) context += " (Yes: " + v.vote_yes.join(", ") + ")";
              if (v.vote_no && v.vote_no.length) context += " (No: " + v.vote_no.join(", ") + ")";
              context += "\n";
            }
          }
          if (ed.decisions && ed.decisions.length) {
            context += "Decisions:\n";
            for (var j = 0; j < Math.min(ed.decisions.length, 6); j++) {
              var d = ed.decisions[j];
              context += "  - " + d.description;
              if (d.dollar_amount) context += " ($" + Number(d.dollar_amount).toLocaleString() + ")";
              context += "\n";
            }
          }
          if (ed.trustee_statements && ed.trustee_statements.length) {
            context += "Trustee Statements:\n";
            for (var j = 0; j < Math.min(ed.trustee_statements.length, 4); j++) {
              var s = ed.trustee_statements[j];
              context += "  - " + s.trustee_name + ": " + s.summary + "\n";
            }
          }
        }
      }
    }

    // Votes
    if (votes.length > 0) {
      context += "\n=== MATCHING VOTES ===\n";
      for (var i = 0; i < Math.min(votes.length, 15); i++) {
        var v = votes[i];
        context += v.meeting_date + ": " + v.motion_text + " -> " + v.result;
        if (v.vote_yes && v.vote_yes.length) context += " | Yes: " + v.vote_yes.join(", ");
        if (v.vote_no && v.vote_no.length) context += " | No: " + v.vote_no.join(", ");
        context += "\n";
      }
    }

    // Decisions
    if (decisions.length > 0) {
      context += "\n=== MATCHING DECISIONS ===\n";
      for (var i = 0; i < Math.min(decisions.length, 15); i++) {
        var d = decisions[i];
        context += d.meeting_date + ": " + d.description;
        if (d.dollar_amount) context += " ($" + Number(d.dollar_amount).toLocaleString() + ")";
        if (d.category) context += " [" + d.category + "]";
        context += "\n";
      }
    }

    // Budget documents
    if (allBudget.length > 0) {
      context += "\n=== BUDGET DOCUMENTS ===\n";
      for (var i = 0; i < Math.min(allBudget.length, 10); i++) {
        var b = allBudget[i];
        context += b.fiscal_year + ": " + b.title + "\n";
        if (b.total_revenue) context += "  Revenue: $" + Number(b.total_revenue).toLocaleString() + "\n";
        if (b.total_expenditures) context += "  Expenditures: $" + Number(b.total_expenditures).toLocaleString() + "\n";
        if (b.personnel_costs) {
          context += "  Personnel Costs: $" + Number(b.personnel_costs).toLocaleString();
          if (b.personnel_cost_percentage) context += " (" + b.personnel_cost_percentage + "%)";
          context += "\n";
        }
        if (b.fund_balance) context += "  Fund Balance: $" + Number(b.fund_balance).toLocaleString() + "\n";
        if (b.enrollment_ftes) context += "  Enrollment FTES: " + Number(b.enrollment_ftes).toLocaleString() + "\n";
        if (b.key_findings && b.key_findings.length) {
          context += "  Findings: " + b.key_findings.join("; ") + "\n";
        }
      }
    }

    // Policy documents
    if (policyDocs.length > 0) {
      context += "\n=== CALIFORNIA POLICY DOCUMENTS ===\n";
      for (var i = 0; i < Math.min(policyDocs.length, 10); i++) {
        var p = policyDocs[i];
        context += p.title + " [" + p.source + "]\n";
        if (p.summary) context += "  Summary: " + p.summary + "\n";
        if (p.impact_on_community_colleges) context += "  CC Impact: " + p.impact_on_community_colleges + "\n";
        if (p.impact_on_smc) context += "  SMC Impact: " + p.impact_on_smc + "\n";
        if (p.key_provisions && p.key_provisions.length) {
          context += "  Provisions: " + p.key_provisions.join("; ") + "\n";
        }
        if (p.funding_implications) context += "  Funding: " + p.funding_implications + "\n";
        if (p.related_programs && p.related_programs.length) {
          context += "  Programs: " + p.related_programs.join(", ") + "\n";
        }
      }
    }

    // ===== GEMINI =====
    var systemPrompt = "You are CivicLens, a civic transparency AI for Santa Monica College. You answer questions using ONLY the data provided below, which includes board meeting records, vote histories, budget reports, and California policy documents.\n\nRULES:\n- Cite specific meeting dates, budget fiscal years, or bill numbers for every claim.\n- Include trustee vote breakdowns when available.\n- When discussing budget, include dollar amounts and percentages.\n- When discussing state policy, explain how the bill or memo affects SMC specifically.\n- If data is insufficient, say so honestly and suggest what to search for.\n- Current trustees (Dec 2025-Dec 2026): Chair Dr. Sion Roy, Vice Chair Dr. Tom Peters, Dr. Nancy Greenstein, Dr. Margaret Quinones-Perez, Dr. Luis Barrera Castanon (appointed Feb 2025), Rob Rader, Anastasia Foster (elected Nov 2024).\n- Write in plain text paragraphs. Do NOT use markdown like ** or ## or bullet points.\n- End with a line listing the sources referenced (meeting dates, budget documents, or bill numbers).\n\n" + context;

    var geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: question }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.3, maxOutputTokens: 3000 }
        })
      }
    );

    var geminiData = await geminiRes.json();
    if (geminiData.error) return res.status(500).json({ error: geminiData.error.message });

    var answer = "I couldn't generate a response.";
    if (geminiData.candidates && geminiData.candidates[0] && geminiData.candidates[0].content && geminiData.candidates[0].content.parts && geminiData.candidates[0].content.parts[0]) {
      answer = geminiData.candidates[0].content.parts[0].text;
    }

    return res.status(200).json({
      answer: answer,
      sources: {
        meetings_found: allMeetings.length,
        votes_found: votes.length,
        decisions_found: decisions.length,
        budget_docs_found: allBudget.length,
        policy_docs_found: policyDocs.length
      }
    });

  } catch (err) {
    console.error("CivicLens API error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
