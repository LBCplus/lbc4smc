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

  try {
    // Build search terms
    const stop = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","was","are","were","been","has","have","had","do","does","did","will","would","could","should","may","might","can","how","what","when","where","who","which","that","this","these","those","about","most","recent","last","latest","first","all","any","each","every","many","much","some","more","other","into"]);
    const words = question.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 2 && !stop.has(w); });
    const sq = words.join("+");

    // 1. Always get recent meetings
    var recentMeetings = [];
    try {
      var r1 = await fetch(SUPABASE_URL + "/rest/v1/meetings?select=id,date,meeting_type,title,topics,extracted_data&order=date.desc&limit=10", { headers: h });
      var d1 = await r1.json();
      if (Array.isArray(d1)) recentMeetings = d1;
    } catch(e) {}

    // 2. FTS search meetings
    var searchMeetings = [];
    if (sq) {
      try {
        var r2 = await fetch(SUPABASE_URL + "/rest/v1/meetings?select=id,date,meeting_type,title,topics,extracted_data&fts=fts." + encodeURIComponent(sq) + "&order=date.desc&limit=15", { headers: h });
        var d2 = await r2.json();
        if (Array.isArray(d2)) searchMeetings = d2;
      } catch(e) {}
    }

    // 3. FTS search votes
    var votes = [];
    if (sq) {
      try {
        var r3 = await fetch(SUPABASE_URL + "/rest/v1/votes?select=meeting_date,motion_text,result,vote_yes,vote_no,vote_abstain,vote_absent,topic_tags&fts=fts." + encodeURIComponent(sq) + "&order=meeting_date.desc&limit=20", { headers: h });
        var d3 = await r3.json();
        if (Array.isArray(d3)) votes = d3;
      } catch(e) {}
    }

    // 4. FTS search decisions
    var decisions = [];
    if (sq) {
      try {
        var r4 = await fetch(SUPABASE_URL + "/rest/v1/decisions?select=meeting_date,description,category,dollar_amount,topic_tags&fts=fts." + encodeURIComponent(sq) + "&order=meeting_date.desc&limit=20", { headers: h });
        var d4 = await r4.json();
        if (Array.isArray(d4)) decisions = d4;
      } catch(e) {}
    }

    // 5. FTS search budget documents
    var budgetDocs = [];
    if (sq) {
      try {
        var r5 = await fetch(SUPABASE_URL + "/rest/v1/budget_documents?select=fiscal_year,title,doc_type,extracted_data,key_findings,total_revenue,total_expenditures,personnel_costs,personnel_cost_percentage,fund_balance,enrollment_ftes&fts=fts." + encodeURIComponent(sq) + "&order=fiscal_year.desc&limit=10", { headers: h });
        var d5 = await r5.json();
        if (Array.isArray(d5)) budgetDocs = d5;
      } catch(e) {}
    }

    // Also always get recent budget docs for financial questions
    var recentBudget = [];
    try {
      var r6 = await fetch(SUPABASE_URL + "/rest/v1/budget_documents?select=fiscal_year,title,doc_type,total_revenue,total_expenditures,personnel_costs,personnel_cost_percentage,fund_balance,enrollment_ftes,key_findings&order=fiscal_year.desc&limit=5", { headers: h });
      var d6 = await r6.json();
      if (Array.isArray(d6)) recentBudget = d6;
    } catch(e) {}

    // Merge meetings (deduplicate)
    var seenDates = {};
    var allMeetings = [];
    var combined = searchMeetings.concat(recentMeetings);
    for (var i = 0; i < combined.length; i++) {
      var m = combined[i];
      var key = m.date + "_" + m.meeting_type;
      if (!seenDates[key]) {
        seenDates[key] = true;
        allMeetings.push(m);
      }
    }
    allMeetings.sort(function(a, b) { return b.date.localeCompare(a.date); });

    // Merge budget docs (deduplicate)
    var seenBudget = {};
    var allBudget = [];
    var combinedBudget = budgetDocs.concat(recentBudget);
    for (var i = 0; i < combinedBudget.length; i++) {
      var b = combinedBudget[i];
      var bkey = b.fiscal_year + "_" + b.title;
      if (!seenBudget[bkey]) {
        seenBudget[bkey] = true;
        allBudget.push(b);
      }
    }

    // Build context
    var context = "SANTA MONICA COLLEGE BOARD OF TRUSTEES DATA\n";
    context += "Database: 349 meetings (1998-2026), 2,656 votes, 9,819 decisions, 72 budget documents.\n\n";

    if (allMeetings.length > 0) {
      context += "=== MEETINGS ===\n";
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
          context += "  Key Findings: " + b.key_findings.join("; ") + "\n";
        }
      }
    }

    // Gemini
    var systemPrompt = "You are CivicLens, a civic transparency AI for Santa Monica College Board of Trustees public records. Answer using ONLY the data below.\n\nRULES:\n- Cite specific meeting dates or budget document fiscal years for every claim\n- Include trustee vote breakdowns when available\n- If data is insufficient, say so honestly\n- Include dollar amounts when discussing budget items\n- Current trustees (Dec 2025-Dec 2026): Chair Dr. Sion Roy, Vice Chair Dr. Tom Peters, Dr. Nancy Greenstein, Dr. Margaret Quinones-Perez, Dr. Luis Barrera Castanon (appointed Feb 2025), Rob Rader, Anastasia Foster (elected Nov 2024)\n- Write in plain text paragraphs. Do NOT use markdown like ** or ## or bullet points.\n- End with a line listing the meeting dates or budget documents referenced.\n\n" + context;

    var geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: question }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
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
        budget_docs_found: allBudget.length
      }
    });

  } catch (err) {
    console.error("CivicLens API error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
