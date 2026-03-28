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
  if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_KEY) return res.status(500).json({ error: "Server config incomplete" });
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
  try {
    const stopWords = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","was","are","were","been","has","have","had","do","does","did","will","would","could","should","may","might","can","how","what","when","where","who","which","that","this","these","those","about","most","recent","last","latest","first","all","any","each","every","many","much","some","more","other","into"]);
    const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    const searchQuery = words.join("+");
    const recentRes = await fetch(`${SUPABASE_URL}/rest/v1/meetings?select=id,date,meeting_type,title,topics,extracted_data&order=date.desc&limit=10`, { headers });
    const recentMeetings = await recentRes.json();
    let searchMeetings = [];
    if (searchQuery) { try { const r = await fetch(`${SUPABASE_URL}/rest/v1/meetings?select=id,date,meeting_type,title,topics,extracted_data&fts=fts.${encodeURIComponent(searchQuery)}&order=date.desc&limit=15`, { headers }); const d = await r.json(); if (Array.isArray(d)) searchMeetings = d; } catch {} }
    let votes = [];
    if (searchQuery) { try { const r = await fetch(`${SUPABASE_URL}/rest/v1/votes?select=meeting_date,motion_text,result,vote_yes,vote_no,vote_abstain,vote_absent,topic_tags&fts=fts.${encodeURIComponent(searchQuery)}&order=meeting_date.desc&limit=20`, { headers }); const d = await r.json(); if (Array.isArray(d)) votes = d; } catch {} }
    let decisions = [];
    if (searchQuery) { try { const r = await fetch(`${SUPABASE_URL}/rest/v1/decisions?select=meeting_date,description,category,dollar_amount,topic_tags&fts=fts.${encodeURIComponent(searchQuery)}&order=meeting_date.desc&limit=20`, { headers }); const d = await r.json(); if (Array.isArray(d)) decisions = d; } catch {} }
    const seenDates = new Set();
    const allMeetings = [];
    for (const m of [...searchMeetings, ...recentMeetings]) { const key = `${m.date}_${m.meeting_type}`; if (!seenDates.has(key)) { seenDates.add(key); allMeetings.push(m); } }
    allMeetings.sort((a, b) => b.date.localeCompare(a.date));
    let context = "SANTA MONICA COLLEGE BOARD OF TRUSTEES DATA\nDatabase: 349 meetings (1998-2026), 2,656 votes, 9,819 decisions.\n\n";
    if (allMeetings.length > 0) { context += "=== MEETINGS ===\n"; for (const m of allMeetings.slice(0, 15)) { context += `\nDate: ${m.date} | Type: ${m.meeting_type} | Topics: ${(m.topics || []).join(", ")}\n`; if (m.extracted_data) { const ed = m.extracted_data; if (ed.votes?.length) { context += "Votes:\n"; for (const v of ed.votes.slice(0, 8)) { context += `  - ${v.motion_text} -> ${v.result}`; if (v.vote_yes?.length) context += ` (Yes: ${v.vote_yes.join(", ")})`; if (v.vote_no?.length) context += ` (No: ${v.vote_no.join(", ")})`; context += "\n"; } } if (ed.decisions?.length) { context += "Decisions:\n"; for (const d of ed.decisions.slice(0, 8)) { context += `  - ${d.description}`; if (d.dollar_amount) context += ` ($${Number(d.dollar_amount).toLocaleString()})`; context += "\n"; } } if (ed.trustee_statements?.length) { context += "Trustee Statements:\n"; for (const s of ed.trustee_statements.slice(0, 5)) { context += `  - ${s.trustee_name}: ${s.summary}\n`; } } } } }
    if (votes.length > 0) { context += "\n=== MATCHING VOTES ===\n"; for (const v of votes.slice(0, 15)) { context += `${v.meeting_date}: ${v.motion_text} -> ${v.result}`; if (v.vote_yes?.length) context += ` | Yes: ${v.vote_yes.join(", ")}`; if (v.vote_no?.length) context += ` | No: ${v.vote_no.join(", ")}`; context += "\n"; } }
    if (decisions.length > 0) { context += "\n=== MATCHING DECISIONS ===\n"; for (const d of decisions.slice(0, 15)) { context += `${d.meeting_date}: ${d.description}`; if (d.dollar_amount) context += ` ($${Number(d.dollar_amount).toLocaleString()})`; if (d.category) context += ` [${d.category}]`; context += "\n"; } }
    const systemPrompt = `You are CivicLens, a civic transparency AI for Santa Monica College Board of Trustees public records. Answer using ONLY the data below.\n\nRULES:\n- Cite specific meeting dates for every claim\n- Include trustee vote breakdowns when available\n- If data is insufficient, say so honestly\n- Include dollar amounts when discussing budget items\n- Current trustees (2025-2026): Dr. Louise Jaffe (Chair), Dr. Nancy Greenstein, Dr. Margaret Quinones-Perez, Dr. Susan Aminoff, Dr. Luis Barrera Castanon (appointed Feb 2025), Rob Rader, Sion Roy\n- Write in plain text paragraphs. Do NOT use markdown like ** or ## or bullet points.\n- End with "Meeting dates referenced:" and list the dates you cited.\n\n${context}`;
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: question }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.3, maxOutputTokens: 2048 } }) });
    const geminiData = await geminiRes.json();
    if (geminiData.error) return res.status(500).json({ error: geminiData.error.message });
    const answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
    return res.status(200).json({ answer, sources: { meetings_found: allMeetings.length, votes_found: votes.length, decisions_found: decisions.length } });
  } catch (err) { console.error("CivicLens API error:", err); return res.status(500).json({ error: "Something went wrong. Please try again." }); }
}
