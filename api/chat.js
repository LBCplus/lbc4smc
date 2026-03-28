// /api/chat.js — CivicLens Q&A API
// Vercel serverless function: searches Supabase meeting data, answers with Gemini

export default async function handler(req, res) {
  // CORS
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
    return res.status(500).json({ error: "Server configuration incomplete" });
  }

  try {
    // Step 1: Search Supabase for relevant meetings, votes, and decisions
    const searchTerms = question.toLowerCase().split(/\s+/).filter(w => w.length > 3).join(" & ");
    
    // Full-text search on meetings
    const meetingsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/meetings?fts=fts.${encodeURIComponent(searchTerms)}&select=id,date,meeting_type,title,topics,extracted_data&order=date.desc&limit=15`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    let meetings = await meetingsRes.json();

    // Also search votes
    const votesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/votes?fts=fts.${encodeURIComponent(searchTerms)}&select=meeting_date,motion_text,result,vote_yes,vote_no,vote_abstain,vote_absent,topic_tags,agenda_item&order=meeting_date.desc&limit=20`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    let votes = await votesRes.json();

    // Search decisions
    const decisionsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/decisions?fts=fts.${encodeURIComponent(searchTerms)}&select=meeting_date,description,category,dollar_amount,topic_tags&order=meeting_date.desc&limit=20`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    let decisions = await decisionsRes.json();

    // If full-text search returned nothing, try topic-based fallback
    if ((!meetings || meetings.length === 0) && (!votes || votes.length === 0)) {
      // Get recent meetings as fallback context
      const fallbackRes = await fetch(
        `${SUPABASE_URL}/rest/v1/meetings?select=id,date,meeting_type,title,topics,extracted_data&order=date.desc&limit=10`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      meetings = await fallbackRes.json();
    }

    // Handle errors from Supabase
    if (meetings?.message || meetings?.error) meetings = [];
    if (votes?.message || votes?.error) votes = [];
    if (decisions?.message || decisions?.error) decisions = [];

    // Step 2: Build context for Gemini
    let context = "SANTA MONICA COLLEGE BOARD OF TRUSTEES DATA\n\n";

    if (meetings.length > 0) {
      context += "=== RELEVANT MEETINGS ===\n";
      for (const m of meetings.slice(0, 10)) {
        context += `\nDate: ${m.date} | Type: ${m.meeting_type} | Topics: ${(m.topics || []).join(", ")}\n`;
        if (m.extracted_data) {
          const ed = m.extracted_data;
          if (ed.votes?.length) {
            context += "Votes:\n";
            for (const v of ed.votes.slice(0, 5)) {
              context += `  - ${v.motion_text} → ${v.result}`;
              if (v.vote_yes?.length) context += ` (Yes: ${v.vote_yes.join(", ")})`;
              if (v.vote_no?.length) context += ` (No: ${v.vote_no.join(", ")})`;
              context += "\n";
            }
          }
          if (ed.decisions?.length) {
            context += "Decisions:\n";
            for (const d of ed.decisions.slice(0, 5)) {
              context += `  - ${d.description}`;
              if (d.dollar_amount) context += ` ($${d.dollar_amount.toLocaleString()})`;
              context += "\n";
            }
          }
          if (ed.trustee_statements?.length) {
            context += "Trustee Statements:\n";
            for (const s of ed.trustee_statements.slice(0, 3)) {
              context += `  - ${s.trustee_name}: ${s.summary}\n`;
            }
          }
        }
      }
    }

    if (votes.length > 0) {
      context += "\n=== RELEVANT VOTES ===\n";
      for (const v of votes.slice(0, 15)) {
        context += `${v.meeting_date}: ${v.motion_text} → ${v.result}`;
        if (v.vote_yes?.length) context += ` | Yes: ${v.vote_yes.join(", ")}`;
        if (v.vote_no?.length) context += ` | No: ${v.vote_no.join(", ")}`;
        context += "\n";
      }
    }

    if (decisions.length > 0) {
      context += "\n=== RELEVANT DECISIONS ===\n";
      for (const d of decisions.slice(0, 15)) {
        context += `${d.meeting_date}: ${d.description}`;
        if (d.dollar_amount) context += ` ($${Number(d.dollar_amount).toLocaleString()})`;
        if (d.category) context += ` [${d.category}]`;
        context += "\n";
      }
    }

    // Step 3: Send to Gemini
    const systemPrompt = `You are CivicLens, a civic transparency AI assistant for Santa Monica College Board of Trustees public records. You answer questions about board meetings, votes, decisions, and policies using ONLY the data provided below.

RULES:
- Always cite specific meeting dates when referencing decisions or votes
- If you mention a vote, include how each trustee voted when available
- If the data doesn't contain enough information to fully answer, say so honestly
- Be concise but thorough — voters are busy
- When discussing budget items, include dollar amounts when available
- Current trustees (2025-2026): Dr. Louise Jaffe (Chair), Dr. Nancy Greenstein, Dr. Margaret Quiñones-Perez, Dr. Susan Aminoff, Dr. Luis Barrera Castañón (appointed Feb 2025), Rob Rader, Sion Roy
- Format your response with clear paragraphs, not bullet points
- End with a note about which meeting dates were referenced

${context}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
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

    const geminiData = await geminiRes.json();

    if (geminiData.error) {
      return res.status(500).json({ error: geminiData.error.message });
    }

    const answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";

    return res.status(200).json({
      answer,
      sources: {
        meetings_found: meetings.length,
        votes_found: votes.length,
        decisions_found: decisions.length,
      }
    });

  } catch (err) {
    console.error("CivicLens API error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
