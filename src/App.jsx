import { useState, useEffect, useRef } from "react";

const SECTIONS = ["home", "story", "priorities", "record", "community", "español", "join"];

function useScrollSpy(sectionIds) {
  const [active, setActive] = useState(sectionIds[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return active;
}

function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Nav({ active, menuOpen, setMenuOpen }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`site-nav ${scrolled ? "nav-scrolled" : ""}`}>
      <div className="nav-inner">
        <a href="#home" onClick={() => setMenuOpen(false)} className="nav-brand">
          Luis Barrera Castañón
          <span className="nav-badge">for SMC Board of Trustees</span>
        </a>
        <button onClick={() => setMenuOpen(!menuOpen)} className="mobile-menu-btn" aria-label="Menu">
          <div className="hamburger">
            <span className={`ham-line ${menuOpen ? "ham-top-open" : ""}`} />
            <span className={`ham-line ${menuOpen ? "ham-mid-open" : ""}`} />
            <span className={`ham-line ${menuOpen ? "ham-bot-open" : ""}`} />
          </div>
        </button>
        <div className="nav-links">
          {SECTIONS.filter(s => s !== "home").map((s) => (
            <a key={s} href={`#${s}`} className={`nav-link ${active === s ? "nav-active" : ""}`}>
              {s === "español" ? "Español" : s === "join" ? "Get Involved" : s.charAt(0).toUpperCase() + s.slice(1)}
            </a>
          ))}
        </div>
      </div>
      <div className={`mobile-nav ${menuOpen ? "mobile-nav-open" : ""}`}>
        {SECTIONS.filter(s => s !== "home").map((s) => (
          <a key={s} href={`#${s}`} onClick={() => setMenuOpen(false)}
            className={`mobile-nav-link ${active === s ? "mobile-nav-active" : ""}`}>
            {s === "español" ? "Español" : s === "join" ? "Get Involved" : s.charAt(0).toUpperCase() + s.slice(1)}
          </a>
        ))}
      </div>
    </nav>
  );
}

function SectionLabel({ children, light }) {
  return (
    <div style={{
      fontFamily: "'Source Sans 3', sans-serif", fontSize: 18, fontWeight: 700,
      color: "#F7CF3D", letterSpacing: "0.16em", textTransform: "uppercase",
      marginBottom: 16, display: "flex", alignItems: "center", gap: 12
    }}>
      <span style={{ width: 28, height: 1.5, background: "#F7CF3D", display: "inline-block", borderRadius: 1 }} />
      {children}
    </div>
  );
}

function Hero() {
  const [vis, setVis] = useState(false);
  useEffect(() => { setTimeout(() => setVis(true), 150); }, []);
  return (
    <section id="home" className="hero-section">
      <div className="hero-dots" />
      <div className="hero-glow" />
      <div className="hero-glow-2" />
      <div className="hero-content">
        <div className="hero-grid">
          <div className={`hero-text ${vis ? "hero-visible" : ""}`}>
            <SectionLabel>Santa Monica College Board of Trustees · November 2026</SectionLabel>
            <h1 className="hero-heading">
              Transparency isn't<br />a campaign promise.<br />
              <span style={{ color: "#F7CF3D" }}>It's a technology.</span>
            </h1>
            <p className="hero-sub">
              Twenty-five years ago, I walked along Pico Boulevard as an undocumented teenager 
              and saw a bus ad for Santa Monica College. That decision changed the trajectory of my 
              life. Now I'm seeking your support to make sure SMC continues this mission. 
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <a href="#record" className="btn-primary">See My Voting Record and Voting Record for All Trustees →</a>
              <a href="#story" className="btn-ghost">Read My Story</a>
            </div>
          </div>
          <div className={`hero-photo ${vis ? "hero-visible" : ""}`}>
            <img src="/images/hero-headshot.jpeg" alt="Luis Barrera Castañón" className="hero-img" />
          </div>
        </div>
        <div className={`hero-stats ${vis ? "hero-stats-visible" : ""}`}>
          {[
            { num: "25+", label: "Years connected to SMC" },
            { num: "20+", label: "Years with workforce development & higher education policy experience" },
            { num: "17+", label: "Years in the nonprofit & economic development industries" },
            { num: "15+", label: "Years of direct policy and advocacy experience in community colleges" }
          ].map((s, i) => (
            <div key={i} className="hero-stat">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Story() {
  const [ref, vis] = useInView();
  const items = [
    { year: "~1988", title: "Escaping violence", text: "My family arrived in California as undocumented immigrants after a month-long trek through Latin America. We knew no one. My father started in the fields of the Central Valley, then moved to janitorial crews in downtown LA high-rises." },
    { year: "Jan 2000", title: "A bus ad changed everything", text: "Walking to high school along Pico Boulevard, I saw daily bus ads for Santa Monica College. One of my father's clients suggested I get a college vocational certificate. I enrolled — looking for a plumbing certificate SMC didn't offer. But by then, it didn't matter. SMC had already ignited something in me." },
    { year: "2000–03", title: "Finding my voice at SMC", text: "As an undocumented student, I found safety and acceptance in community. I joined student clubs, entered student government, and became Student Body President. Seeing Latino and Latina leaders in senior positions at SMC showed me that other professional lives were possible. SMC didn't just educate me — it taught me to dream beyond my circumstances." },
    { year: "2003–06", title: "U.C. Berkeley and beyond", text: "I transferred to UC Berkeley and earned my B.A. My enrollment at SMC inspired younger relatives to pursue higher education. One decision created a generational shift." },
    { year: "2006–25", title: "19 years building career pathways", text: "From the private sector in Silicon Valley to the offices of Para Los Niños on Skid Row, the National Council of La Raza, the Los Angeles Area Chamber of Commerce, the Foundation for California Community Colleges and leading 200+ staff at Goodwill Southern California — I spent nearly two decades in the workforce building pathways to vocations and colleges for the communities I come from. My Educational Doctorate Degree from Cal State Northridge focused on career pathway partnerships. Not by luck, but with intention." },
    { year: "Feb 2025", title: "Back where it all started", text: "Appointed to the SMC Board of Trustees. Full circle. Now I'm working to ensure the college that transformed my life keeps transforming others — with innovation, accountability and transparency." }
  ];

  return (
    <section id="story" style={{ background: "#FAF7F2", padding: "100px 24px" }}>
      <div ref={ref} style={{ maxWidth: 760, margin: "0 auto" }}>
        <SectionLabel>My Story</SectionLabel>
        <h2 className="section-heading dark">From the fields of Salinas<br />to the boardroom of SMC.</h2>
        <p className="section-intro dark">
          My path to the Board of Trustees wasn't a straight line. It started 
          with a bus ad, a plumbing certificate that didn't exist, and a college 
          that showed me what was possible.
        </p>

        <div className="timeline">
          <div className="timeline-line" />
          {items.map((item, i) => (
            <div key={i}>
              <div className="timeline-item" style={{
                opacity: vis ? 1 : 0,
                transform: vis ? "translateX(0)" : "translateX(-16px)",
                transition: `all 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.09}s`
              }}>
                <div className={`timeline-dot ${i === items.length - 1 ? "timeline-dot-active" : ""}`} />
                <div className="timeline-year">{item.year}</div>
                <h3 className="timeline-title">{item.title}</h3>
                <p className="timeline-text">{item.text}</p>
              </div>
              {i === 0 && (
                <div className="story-photos" style={{
                  opacity: vis ? 1 : 0, transition: "opacity 0.8s ease 0.3s"
                }}>
                  <img src="/images/family-latin-america.jpeg" alt="Family in Latin America, before the journey" className="story-photo" />
                  <img src="/images/young-lbc-california.jpeg" alt="Young Luis in California" className="story-photo" />
                </div>
              )}
              {i === 1 && (
                <div className="story-photos" style={{
                  opacity: vis ? 1 : 0, transition: "opacity 0.8s ease 0.4s"
                }}>
                  <img src="/images/childhood-griffith-93.jpeg" alt="Kids at Griffith Observatory, December 1993" className="story-photo" />
                  <img src="/images/childhood-california-95.jpeg" alt="Growing up in California, February 1995" className="story-photo" />
                </div>
              )}
              {i === 2 && (
                <div className="story-photos" style={{
                  opacity: vis ? 1 : 0, transition: "opacity 0.8s ease 0.5s"
                }}>
                  <img src="/images/smc-associated-students-2001.jpeg" alt="Associated Students at Santa Monica College, 2001" className="story-photo" style={{ gridColumn: "1 / -1" }} />
                  <img src="/images/smc-as-vp-office.jpeg" alt="In the A.S. Vice President office at Santa Monica College" className="story-photo story-photo-tall" />
                  <img src="/images/smc-speaking-2002.jpeg" alt="Speaking at Festival of Sacred Music, Los Angeles, 2002" className="story-photo story-photo-tall" />
                </div>
              )}
              {i === 3 && (
                <div className="story-photos story-photos-single" style={{
                  opacity: vis ? 1 : 0, transition: "opacity 0.8s ease 0.55s"
                }}>
                  <img src="/images/berkeley-oski.jpeg" alt="With Oski the Bear at UC Berkeley" className="story-photo" />
                </div>
              )}
              {i === 4 && (
                <div className="story-photos" style={{
                  opacity: vis ? 1 : 0, transition: "opacity 0.8s ease 0.6s"
                }}>
                  <img src="/images/nclr-podium.jpeg" alt="Speaking at National Council of La Raza conference" className="story-photo" />
                  <img src="/images/doctorate-graduation.jpeg" alt="Ed.D. graduation from Cal State Northridge" className="story-photo story-photo-tall" />
                </div>
              )}
              {i === 5 && (
                <div className="story-photos" style={{
                  opacity: vis ? 1 : 0, transition: "opacity 0.8s ease 0.7s"
                }}>
                  <img src="/images/smc-podium-2025.jpeg" alt="Speaking at Santa Monica College, 2025" className="story-photo story-photo-tall" />
                  <img src="/images/board-appointment-2025.jpeg" alt="Board of Trustees appointment ceremony, February 2025" className="story-photo story-photo-tall" />
                </div>
              )}
            </div>
          ))}
        </div>

        <blockquote className="pull-quote">
          "Santa Monica College didn't just provide an education — it changed the trajectory 
          of my life. Its impact extended throughout my family, as younger relatives were 
          inspired to pursue higher education just by witnessing me walk the stage."
        </blockquote>
      </div>
    </section>
  );
}

function Priorities() {
  const [exp, setExp] = useState(null);
  const [ref, vis] = useInView();
  const items = [
    { icon: "📊", title: "Fiscal Accountability & SCFF Alignment", summary: "SMC has been on fiscal life support for 7 years. This is not my opinion, it is written in the budget presentations across every year.", detail: "SMC has operated under the state's Hold Harmless provision since 2018 — meaning the college doesn't generate enough student success outcomes to earn its funding through the Student-Centered Funding Formula. When this protection expires, SMC faces a ~$17 million annual shortfall. Meanwhile, 91.4% of discretionary spending goes to personnel costs. While $0 goes to workforce development and upskilling from our general fund. I'm pushing for an SCFF gap analysis and alignment, outcome-based budgeting, and a dedicated workforce investment and strategy." },
    { icon: "🎓", title: "Student Success as Revenue Strategy", summary: "Investing in students isn't just right — it's how the college gets funded.", detail: "Under the SCFF, California rewards colleges for completions, transfers, and living wage attainment. The moral case and the fiscal case are the same case. I'm advocating for a strategic institutional focus on Career Pathways, expanding career technical education, investing in professional development, and creating clear pathways from enrollment to living-wage employment." },
    { icon: "🛡️", title: "Campus Safety & Workplace Culture", summary: "After the October 2024 on-campus murder, safety and trust must be rebuilt.", detail: "The workplace violence incident of October 14, 2024 exposed critical gaps — non-functional security cameras, inadequate lighting, inconsistent emergency training. Staff morale is at a low point. Throughout my career, I built trust through clear staffing plans, realistic organizational goals, and transparent communication. SMC needs the same systematic approach." },
    { icon: "💼", title: "Workforce Alignment & Regional Partnerships", summary: "SMC's general fund budget shows zero strategy connecting students to living-wage careers.", detail: "Living wage attainment is a state funding metric — yet SMC has no identifiable general fund budget investments in career services, employer engagement, or post-completion wage tracking. I'm advocating for regional workforce alignment, expanded work-based learning, and sector-based partnerships that tie directly to the state funding formula." },
    { icon: "🏠", title: "Bundy Campus & Student Housing", summary: "The bond Santa Monica voters approved was for the college to help those students who are in the most need. ", detail: "Santa Monica residents voted for a bond that clearly stipulated student housing for homeless or at-risk-of-homelessness students. As honest promise-keepers to our community, we must ensure this bond addresses exactly what voters approved. That it provides for a housing solution across all of our campuses that will continue to revitalize our community and solve some of the housing issues of our students." },
    { icon: "🌎", title: "Equity, Access & Enrollment Recovery", summary: "Enrollment has declined significantly since 2018. We need a plan, not just cuts.", detail: "SMC has lost students at all population types. Our board discussions are far too focused on cuts — furloughs, salary reductions, layoffs — rather than asking what students and the region need now and into the future.  I'm committed to flipping that conversation: targeted outreach, workforce-aligned programming, and ensuring SMC remains a beacon of innovation and inclusivity." }
  ];

  return (
    <section id="priorities" style={{ background: "#003A75", padding: "100px 24px" }}>
      <div ref={ref} style={{ maxWidth: 940, margin: "0 auto" }}>
        <SectionLabel light>Platform</SectionLabel>
        <h2 className="section-heading light">Priorities backed by data,<br />not just promises.</h2>
        <p className="section-intro light">
          These priorities come from an 11-year forensic analysis of SMC's budget decisions 
          against 18 years of California's workforce development goals. Every claim is sourced from public documents.
        </p>

        <div style={{ display: "grid", gap: 4 }}>
          {items.map((p, i) => (
            <div key={i} onClick={() => setExp(exp === i ? null : i)}
              className={`priority-card ${exp === i ? "priority-expanded" : ""}`}
              style={{
                opacity: vis ? 1 : 0,
                transform: vis ? "translateY(0)" : "translateY(12px)",
                transition: `all 0.5s ease ${i * 0.06}s`
              }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{p.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="priority-title">{p.title}</h3>
                  <p className="priority-summary">{p.summary}</p>
                  <div className="priority-detail-wrap" style={{ maxHeight: exp === i ? 800 : 0 }}>
                    <p className="priority-detail">{p.detail}</p>
                  </div>
                </div>
                <span className="priority-toggle" style={{
                  transform: exp === i ? "rotate(45deg)" : "rotate(0)"
                }}>+</span>
              </div>
            </div>
          ))}
        </div>

        <p style={{
          fontFamily: "'Source Sans 3', sans-serif", fontSize: 13,
          color: "rgba(250, 247, 242, 0.3)", marginTop: 36, textAlign: "center", fontStyle: "italic"
        }}>
          Full budget analysis available — data sourced from SMC Adopted Budget Reports, FY 2014-15 through 2024-25.
        </p>
      </div>
    </section>
  );
}

function Record() {
  const [ref, vis] = useInView();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState(null);
  const [history, setHistory] = useState([]);

  const askQuestion = async () => {
    if (!query.trim() || loading) return;
    const q = query.trim();
    setQuery("");
    setLoading(true);
    setAnswer(null);
    setSources(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q })
      });
      const data = await res.json();
      if (data.error) {
        setAnswer("Sorry, I couldn't process that question. Please try again.");
      } else {
        setAnswer(data.answer);
        setSources(data.sources);
        setHistory(prev => [...prev, { q, a: data.answer, s: data.sources }]);
      }
    } catch {
      setAnswer("Connection error. Please try again.");
    }
    setLoading(false);
  };

  const sampleQuestions = [
    "How has the board voted on campus safety since 2024?",
    "What workforce development decisions has the board made?",
    "How did trustees vote on the annual budget?",
    "What has Dr. Barrera Castañón voted on since joining?",
  ];

  return (
    <section id="record" style={{ background: "#FAF7F2", padding: "100px 24px" }}>
      <div ref={ref} style={{ maxWidth: 860, margin: "0 auto" }}>
        <SectionLabel>My Record</SectionLabel>
        <h2 className="section-heading dark">Judge me by my votes,<br />not my words.</h2>
        <p className="section-intro dark">
          Every vote I've cast since my appointment in February 2025 is public record. 
          Search, filter, and explore the complete voting history of every SMC trustee — 
          powered by CivicLens, an open-source civic transparency platform which I designed, built and launched.
        </p>

        <div className="civiclens-card" style={{
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.7s cubic-bezier(0.22, 1, 0.36, 1)"
        }}>
          <div className="civiclens-dots" />
          <div style={{ position: "relative" }}>
            <div className="civiclens-status">
              <div className="status-dot" style={{ background: "#4ade80", boxShadow: "0 0 8px rgba(74,222,128,0.6)" }} />
              <span>CivicLens · Live</span>
            </div>

            {/* Search Input */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && askQuestion()}
                placeholder="Ask about any board decision, vote, or policy..."
                style={{
                  flex: 1, padding: "14px 18px", borderRadius: 8,
                  border: "1px solid rgba(250,247,242,0.15)",
                  background: "rgba(250,247,242,0.08)", color: "#FAF7F2",
                  fontFamily: "'Source Sans 3', sans-serif", fontSize: 15,
                  outline: "none"
                }}
              />
              <button
                onClick={askQuestion}
                disabled={loading || !query.trim()}
                style={{
                  padding: "14px 24px", borderRadius: 8, border: "none",
                  background: loading ? "#646469" : "#F7CF3D", color: "#001838",
                  fontFamily: "'Source Sans 3', sans-serif", fontWeight: 700,
                  fontSize: 14, cursor: loading ? "wait" : "pointer",
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  transition: "background 0.2s"
                }}
              >
                {loading ? "Searching..." : "Ask"}
              </button>
            </div>

            {/* Sample Questions */}
            {!answer && !loading && history.length === 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {sampleQuestions.map((sq, i) => (
                  <button key={i} onClick={() => { setQuery(sq); }}
                    style={{
                      padding: "8px 14px", borderRadius: 20, border: "1px solid rgba(250,247,242,0.15)",
                      background: "rgba(250,247,242,0.05)", color: "rgba(250,247,242,0.7)",
                      fontFamily: "'Source Sans 3', sans-serif", fontSize: 13,
                      cursor: "pointer", transition: "all 0.2s"
                    }}
                  >{sq}</button>
                ))}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div style={{
                padding: "24px", background: "rgba(250,247,242,0.04)", borderRadius: 8,
                marginBottom: 16, color: "rgba(250,247,242,0.6)",
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 15
              }}>
                <span style={{ display: "inline-block", animation: "pulse 1.5s infinite" }}>
                  Searching 349 meetings, 2,656 votes, and 47 policy documents...
                </span>
              </div>
            )}

            {/* Answer */}
            {answer && !loading && (
              <div style={{
                padding: "24px", background: "rgba(250,247,242,0.06)", borderRadius: 8,
                marginBottom: 16, border: "1px solid rgba(250,247,242,0.1)"
              }}>
                <div style={{
                  color: "#FAF7F2", fontFamily: "'Source Serif 4', serif",
                  fontSize: 16, lineHeight: 1.75, whiteSpace: "pre-wrap"
                }}>
                  {answer}
                </div>
                {sources && (
                  <div style={{
                    marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(250,247,242,0.1)",
                    color: "rgba(250,247,242,0.5)", fontSize: 13,
                    fontFamily: "'Source Sans 3', sans-serif"
                  }}>
                    Sources: {sources.meetings_found} meetings, {sources.votes_found} votes, {sources.decisions_found} decisions searched
                  </div>
                )}
              </div>
            )}

            {/* Previous Q&A History */}
            {history.length > 0 && !loading && (
              <div style={{ marginBottom: 16 }}>
                {history.slice(0, -1).reverse().map((h, i) => (
                  <details key={i} style={{ marginBottom: 8 }}>
                    <summary style={{
                      color: "rgba(250,247,242,0.6)", cursor: "pointer",
                      fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, padding: "8px 0"
                    }}>
                      {h.q}
                    </summary>
                    <div style={{
                      padding: "12px 16px", background: "rgba(250,247,242,0.03)",
                      borderRadius: 6, color: "rgba(250,247,242,0.8)",
                      fontFamily: "'Source Serif 4', serif", fontSize: 14, lineHeight: 1.7
                    }}>
                      {h.a}
                    </div>
                  </details>
                ))}
              </div>
            )}

            <p className="civiclens-desc">
              I am the Founder and CEO of EmpathySystem.ai, an AI Database Company for the Healthcare and Nonprofit sectors. 
              I took my technical knowledge and built an AI-powered Q&A system that indexes 25 years of SMC Board of Trustees 
              public meeting records and makes them searchable in plain language. Every answer is 
              grounded in actual board documents with specific citations — dates, vote 
              counts, and full context. No candidate has ever done this before.
            </p>

            <div className="record-stats">
              {[
                { value: "349", label: "Board meetings indexed", sub: "1998 – 2026" },
                { value: "2,656", label: "Votes tracked", sub: "Every trustee, every vote" },
                { value: "9,819", label: "Decisions cataloged", sub: "Budget, policy, personnel" },
                { value: "72", label: "Budget reports analyzed", sub: "Quarterly & adopted budgets" },
                { value: "47", label: "Policy documents indexed", sub: "CA bills, CCCCO, analysis" }
              ].map((s, i) => (
                <div key={i} className="record-stat">
                  <div className="stat-num-sm">{s.value}</div>
                  <div className="stat-label-sm">{s.label}</div>
                  <div className="stat-sub">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Community() {
  const [ref, vis] = useInView();
  const roles = [
    { org: "SMC Board of Trustees", role: "Trustee (Appointed Feb 2025)", c: true },
    { org: "SMC General Advisory Board", role: "Past Member", c: false },
    { org: "SMC Citizens' Bond Oversight", role: "Past Member", c: false },
    { org: "City of SM Human Services Commission", role: "Former Vice Chair", c: false },
    { org: "Santa Monica Democratic Club", role: "Active Member, past Executive Board Member", c: true },
    { org: "SMC Young Alumni Council", role: "Founding Board Member", c: false },
    { org: "SM for Renters' Rights", role: "Active Member", c: true },
    { org: "Wilshire Montana Neighborhood Coalition", role: "Member", c: true },
    { org: "House of Haven", role: "Past Chair, Current Board Member", c: true },
    { org: "Raza Golf Foundation", role: "Board Member", c: true },
  ];
  const career = [
    { title: "Founder & CEO", org: "EmpathySystem.ai", desc: "AI-powered data systems for healthcare, nonprofits, and civic transparency" },
    { title: "Executive Director", org: "BuildWithin", desc: "Apprenticeship innovation — tech, healthcare, and emerging industries" },
    { title: "Strategic Impact Officer", org: "Goodwill Southern California", desc: "Led 200+ staff in workforce development at SoCal's largest nonprofit" },
    { title: "Managing Director", org: "LBC+ Consulting & Creative", desc: "Workforce program architecture for nonprofits and public agencies" },
    { title: "Manager, Education Policy & Programs", org: "LA Area Chamber of Commerce", desc: "Linked Learning, Deeper Learning, Smart Justice, adult education policy" },
    { title: "Sr. Coordinator, K-16 Education & Workforce", org: "National Council of La Raza (UnidosUS)", desc: "Multi-state portfolio — CA, TX, MN, CO, and DC" },
    { title: "Youth Workforce Services Coordinator", org: "Para Los Niños", desc: "College and career programs serving East LA and Downtown LA's Skid Row" },
  ];

  return (
    <section id="community" style={{ background: "#F0F4F8", padding: "100px 24px" }}>
      <div ref={ref} style={{ maxWidth: 940, margin: "0 auto" }}>
        <SectionLabel>Community</SectionLabel>
        <h2 className="section-heading dark">Rooted in Santa Monica.</h2>
        <div className="community-hero-photo" style={{
          margin: "24px 0 32px", borderRadius: 10, overflow: "hidden"
        }}>
          <img src="/images/family-peach.jpeg" alt="Luis with his family in Santa Monica" style={{
            width: "100%", maxWidth: 500, display: "block", borderRadius: 10
          }} />
        </div>
        <p className="section-intro dark">
          My son was born and is being raised in Santa Monica. This is personal. 
          These are the organizations where I show up and the work that got me here.
        </p>

        <div className="community-grid">
          {roles.map((r, i) => (
            <div key={i} className="community-card" style={{
              opacity: vis ? 1 : 0,
              transform: vis ? "translateY(0)" : "translateY(10px)",
              transition: `all 0.45s ease ${i * 0.03}s`
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <h4 className="community-org">{r.org}</h4>
                {r.c && <span className="badge-current">Current</span>}
              </div>
              <span className="community-role">{r.role}</span>
            </div>
          ))}
        </div>

        <h3 className="subsection-heading">Professional Experience</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <img src="/images/smart-on-justice.jpeg" alt="Smart on Justice initiative at the California Department of Justice" style={{
            width: "100%", borderRadius: 8, objectFit: "cover"
          }} />
          <img src="/images/obama-inauguration-2008.jpeg" alt="At the 2008 Presidential Inauguration in Washington, D.C." style={{
            width: "100%", borderRadius: 8, objectFit: "cover"
          }} />
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {career.map((c, i) => (
            <div key={i} className="career-card" style={{
              opacity: vis ? 1 : 0,
              transform: vis ? "translateX(0)" : "translateX(-12px)",
              transition: `all 0.5s ease ${0.35 + i * 0.07}s`
            }}>
              <div className="career-title">{c.title}</div>
              <div className="career-org">{c.org}</div>
              <div className="career-desc">{c.desc}</div>
            </div>
          ))}
        </div>

        <div className="education-card">
          <div className="education-label">Education</div>
          <div className="education-list">
            Ed.D., California State University, Northridge — <em style={{ color: "#646469" }}>Career Pathway Partnerships</em><br />
            M.P.A., California State University, Northridge<br />
            B.A., University of California, Berkeley<br />
            A.A., Santa Monica College
          </div>
        </div>

        <div className="policy-card">
          <div className="education-label">Policy Advocacy</div>
          <div className="education-list">
            California's EDGE Campaign · Ban the Box (public & private sector) · California Career Pathways Trust Fund · 
            Registered Apprenticeship with U.S. DOL & CA Division of Apprenticeship Standards · 
            K-14 integration · High Road Training Partnerships · Workforce Innovation and Opportunity Act · Local Control Funding Formula and Accountability Plans · AB 288 Dual Enrollment · Guided Pathways · Student Equity Plans · Doing What Matters · Strong Workforce Program · Proposition 47 · College Promise and Partnership Act · Every Student Succeeds Act CA Plan
          </div>
        </div>
      </div>
    </section>
  );
}

function Espanol() {
  const [exp, setExp] = useState(null);
  const prioridades = [
    { icon: "📊", title: "Responsabilidad Fiscal", summary: "SMC lleva 7 años dependiendo de protecciones fiscales estatales. Ya es hora de actuar.", detail: "SMC ha operado bajo la provisión Hold Harmless desde 2018 — lo que significa que el colegio no genera suficientes resultados de éxito estudiantil para justificar su financiamiento. Cuando esta protección expire, SMC enfrentará un déficit de ~$17 millones anuales. Mientras tanto, el 91.4% del presupuesto discrecional se destina a costos de personal. Del fondo general, $0 se invierte en desarrollo laboral. Estoy impulsando un análisis de alineación con la fórmula estatal y un presupuesto basado en resultados." },
    { icon: "🎓", title: "Éxito Estudiantil como Estrategia", summary: "Invertir en estudiantes no solo es lo correcto — es como el colegio recibe fondos.", detail: "California premia a los colegios por completar programas, transferencias y que sus egresados alcancen un salario digno. Estoy abogando por un enfoque estratégico en Trayectorias Profesionales, la expansión de educación técnica, y caminos claros desde la inscripción hasta empleos con salarios dignos." },
    { icon: "🛡️", title: "Seguridad y Cultura Laboral", summary: "Después del asesinato en el campus en octubre 2024, hay que reconstruir la confianza.", detail: "El incidente de violencia laboral del 14 de octubre de 2024 expuso fallas críticas — cámaras sin funcionar, iluminación inadecuada, entrenamiento de emergencia inconsistente. A lo largo de mi carrera, he reconstruido la confianza mediante planes claros, metas organizacionales realistas y comunicación transparente." },
    { icon: "💼", title: "Alianzas Laborales Regionales", summary: "El presupuesto general de SMC no muestra estrategia para conectar estudiantes con carreras.", detail: "El salario digno es una métrica de financiamiento estatal — pero SMC no tiene inversiones identificables en servicios de carrera o relaciones con empleadores. Estoy impulsando la alineación laboral regional y asociaciones sectoriales conectadas directamente con la fórmula de financiamiento." },
    { icon: "🏠", title: "Vivienda Estudiantil en Campus Bundy", summary: "El bono que los votantes aprobaron fue para ayudar a los estudiantes más necesitados.", detail: "Los residentes de Santa Mónica votaron por un bono que estipuló vivienda para estudiantes sin hogar o en riesgo. Como guardianes honestos de nuestra comunidad, debemos asegurar que este bono cumpla exactamente lo que los votantes aprobaron." },
    { icon: "🌎", title: "Equidad, Acceso y Recuperación", summary: "La matrícula ha bajado significativamente desde 2018. Necesitamos un plan, no solo recortes.", detail: "SMC ha perdido estudiantes en todas las poblaciones. Las discusiones de la junta se enfocan demasiado en recortes. Estoy comprometido a cambiar esa conversación: alcance dirigido, programas alineados con el mercado laboral, y asegurar que SMC siga siendo un faro de innovación e inclusión." }
  ];

  return (
    <section id="español" style={{ background: "#003A75", padding: "100px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <SectionLabel>Para Nuestra Comunidad</SectionLabel>
        <h2 className="section-heading light" style={{ margin: "0 0 16px" }}>
          La transparencia no es<br />una promesa de campaña.<br />
          <span style={{ color: "#F7CF3D" }}>Es una tecnología.</span>
        </h2>

        <div style={{ margin: "24px 0 32px", textAlign: "center" }}>
          <img src="/images/family-selfie.jpeg" alt="Luis con su familia" style={{
            width: "100%", maxWidth: 460, borderRadius: 10, display: "inline-block"
          }} />
        </div>

        <p style={{
          fontFamily: "'Source Serif 4', serif", fontSize: 18,
          color: "rgba(250, 247, 242, 0.6)", lineHeight: 1.7,
          maxWidth: 600, margin: "0 0 40px"
        }}>
          Hace más de veinticinco años, caminaba por el Bulevar Pico como un joven 
          indocumentado y vi un anuncio de Santa Monica College en un autobús. Esa 
          decisión cambió el rumbo de mi vida. Hoy busco su apoyo para asegurar 
          que SMC continúe esta misión.
        </p>

        {/* Mi Historia */}
        <div style={{
          padding: "28px 32px", background: "rgba(250, 247, 242, 0.04)",
          borderRadius: 8, borderLeft: "3px solid #F7CF3D", marginBottom: 40
        }}>
          <h3 style={{
            fontFamily: "'DM Serif Display', serif", fontSize: 22,
            color: "#FAF7F2", margin: "0 0 12px"
          }}>Mi Historia</h3>
          <p style={{
            fontFamily: "'Source Serif 4', serif", fontSize: 16,
            color: "rgba(250, 247, 242, 0.6)", lineHeight: 1.75, margin: 0
          }}>
            En 1988, mi familia llegó a California como inmigrantes indocumentados después de 
            un viaje de un mes por Latinoamérica. No conocíamos a nadie. Mi padre comenzó en los 
            campos del Valle Central y luego pasó a equipos de limpieza en los edificios del centro 
            de Los Ángeles. En enero del 2000, me inscribí en SMC buscando un certificado de plomería 
            que no existía — pero para entonces, SMC ya había encendido algo en mí. Como estudiante 
            indocumentado, encontré seguridad y aceptación en la comunidad. Me uní al gobierno estudiantil 
            y fui Presidente del Cuerpo Estudiantil. Me transferí a UC Berkeley y obtuve mi licenciatura. 
            Desde el sector privado en Silicon Valley hasta las oficinas de Para Los Niños en Skid Row, 
            el National Council de La Raza, la Cámara de Comercio de Los Ángeles, la Fundación para 
            los Colegios Comunitarios de California, y liderando a más de 200 empleados en Goodwill 
            Southern California — pasé casi dos décadas construyendo trayectorias profesionales para 
            las comunidades de donde vengo. No por suerte, sino con intención. En febrero de 2025, 
            fui nombrado al Consejo de Administración de SMC. El círculo se cerró.
          </p>
        </div>

        {/* Prioridades */}
        <h3 style={{
          fontFamily: "'DM Serif Display', serif", fontSize: 24,
          color: "#FAF7F2", margin: "0 0 20px"
        }}>Mis Prioridades</h3>

        <div style={{ display: "grid", gap: 4, marginBottom: 40 }}>
          {prioridades.map((p, i) => (
            <div key={i} onClick={() => setExp(exp === i ? null : i)}
              className={`priority-card ${exp === i ? "priority-expanded" : ""}`}
              style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{p.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="priority-title">{p.title}</h3>
                  <p className="priority-summary">{p.summary}</p>
                  <div className="priority-detail-wrap" style={{ maxHeight: exp === i ? 800 : 0 }}>
                    <p className="priority-detail">{p.detail}</p>
                  </div>
                </div>
                <span className="priority-toggle" style={{
                  transform: exp === i ? "rotate(45deg)" : "rotate(0)"
                }}>+</span>
              </div>
            </div>
          ))}
        </div>

        {/* CivicLens */}
        <div style={{
          padding: "28px 32px", background: "rgba(250, 247, 242, 0.04)",
          borderRadius: 8, borderLeft: "3px solid #F7CF3D", marginBottom: 40
        }}>
          <h3 style={{
            fontFamily: "'DM Serif Display', serif", fontSize: 22,
            color: "#FAF7F2", margin: "0 0 12px"
          }}>Mi Historial de Votos</h3>
          <p style={{
            fontFamily: "'Source Serif 4', serif", fontSize: 16,
            color: "rgba(250, 247, 242, 0.6)", lineHeight: 1.75, margin: 0
          }}>
            Soy Fundador y CEO de EmpathySystem.ai, una empresa de bases de datos con inteligencia 
            artificial para los sectores de salud y organizaciones sin fines de lucro. Usé ese conocimiento 
            técnico para construir CivicLens — un sistema de preguntas y respuestas que indexa 
            349 reuniones del Consejo de Administración de SMC desde 1998, rastreando 2,656 votos, 
            9,819 decisiones, 72 informes presupuestarios y 47 documentos de política estatal. Cada respuesta está basada en documentos reales del Consejo con 
            citas específicas. Ningún candidato ha hecho esto antes. ¡Esto es transparencia!
          </p>
        </div>

        {/* Nota sobre el idioma */}
        <div style={{ textAlign: "center" }}>
          <p style={{
            fontFamily: "'Source Serif 4', serif", fontSize: 17,
            color: "rgba(250, 247, 242, 0.5)", lineHeight: 1.7,
            maxWidth: 520, margin: "0 auto 12px"
          }}>
            Este contenido fue escrito para nuestra comunidad — no es una traducción. 
            Cada palabra es revisada personalmente para reflejar nuestra cultura y nuestras voces.
          </p>
          <p style={{
            fontFamily: "'Source Serif 4', serif", fontSize: 16,
            color: "rgba(250, 247, 242, 0.4)", lineHeight: 1.7,
            maxWidth: 520, margin: "0 auto 32px"
          }}>
            Nuestra comunidad merece información en su idioma — no como un gesto simbólico, 
            sino como un derecho.
          </p>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "#F7CF3D" }}>
            ¡Sí se puede!
          </div>
        </div>
      </div>
    </section>
  );
}

function Join() {
  const [ref, vis] = useInView();
  return (
    <section id="join" style={{ background: "#FAF7F2", padding: "100px 24px" }}>
      <div ref={ref} style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
        <SectionLabel>Get Involved</SectionLabel>
        <h2 className="section-heading dark">This campaign belongs<br />to the community.</h2>
        <p className="section-intro dark" style={{ textAlign: "center", margin: "0 auto 44px", maxWidth: 500 }}>
          Whether you're an SMC student, alumnus, parent, faculty member, or community 
          resident — your voice matters.
        </p>
        <div className="join-grid">
          {[
            { label: "Volunteer", desc: "Canvass, phone bank, or help organize community events", icon: "🤝" },
            { label: "Endorse", desc: "Add your name and stand with transparent governance", icon: "✍️" },
            { label: "Spread the Word", desc: "Share this site with your neighbors and networks", icon: "📣" }
          ].map((item, i) => (
            <div key={i} className="join-card" style={{
              opacity: vis ? 1 : 0,
              transform: vis ? "translateY(0)" : "translateY(12px)",
              transition: `all 0.5s ease ${i * 0.1}s`
            }}>
              <div style={{ fontSize: 34, marginBottom: 14 }}>{item.icon}</div>
              <h4 className="join-title">{item.label}</h4>
              <p className="join-desc">{item.desc}</p>
            </div>
          ))}
        </div>
        <a href="mailto:LBC4SMC@gmail.com" className="btn-dark" style={{ marginTop: 44, display: "inline-block" }}>
          Contact the Campaign →
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: "#002452", padding: "48px 24px 28px" }}>
      <div style={{ maxWidth: 940, margin: "0 auto" }}>
        <div className="footer-top">
          <div>
            <div className="footer-brand">Luis Barrera Castañón <span style={{ color: "#F7CF3D" }}>for SMC Board of Trustees </span></div>
            <div className="footer-sub">Santa Monica College Board of Trustees<br />November 2026 Election</div>
          </div>
          <div className="footer-links">
            <div>
              <a href="https://www.linkedin.com/in/lbcastanon/" target="_blank" rel="noopener" className="footer-link">LinkedIn</a><br />
              <a href="https://empathysystem.ai/" target="_blank" rel="noopener" className="footer-link">EmpathySystem.ai</a>
            </div>
            <div>
              <a href="https://www.smc.edu/directory/castanon-luis-barrera.php" target="_blank" rel="noopener" className="footer-link">SMC Profile</a><br />
              <a href="https://admin.smc.edu/administration/governance/board-of-trustees/meetings.php" target="_blank" rel="noopener" className="footer-link">Board Minutes</a>
            </div>
          </div>
        </div>
        <div className="footer-legal">
          Paid for by Luis Barrera Castañón for SMC Board of Trustees 2026 (pending campaign filing).<br />
          Transparency powered by <span style={{ color: "rgba(247, 207, 61, 0.5)" }}>CivicLens</span>, an open-source civic transparency platform. © 2026
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const active = useScrollSpy(SECTIONS);
  useEffect(() => {
    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Source+Sans+3:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        html{scroll-behavior:smooth;scroll-padding-top:64px}
        body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
        ::selection{background:rgba(184,134,11,0.2)}
        a:hover{opacity:0.88}

        /* NAV */
        .site-nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(250,247,242,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid rgba(45,62,54,0.06);transition:box-shadow 0.3s}
        .nav-scrolled{box-shadow:0 1px 12px rgba(0,0,0,0.06)}
        .nav-inner{max-width:1200px;margin:0 auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:64px}
        .nav-brand{font-family:'DM Serif Display',serif;font-size:18px;color:#003A75;text-decoration:none;letter-spacing:-0.02em}
        .nav-badge{color:#F7CF3D;margin-left:6px;font-size:18px;font-family:'Source Sans 3',sans-serif;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:#003A75;padding:4px 14px;border-radius:4px}
        .nav-links{display:flex;gap:28px;align-items:center}
        .nav-link{font-family:'Source Sans 3',sans-serif;font-size:12px;font-weight:500;color:#646469;text-decoration:none;text-transform:uppercase;letter-spacing:0.09em;transition:all 0.2s;padding-bottom:3px;border-bottom:2px solid transparent}
        .nav-link:hover{color:#003A75;opacity:1!important}
        .nav-active{color:#003A75!important;font-weight:700;border-bottom-color:#F7CF3D!important}
        .mobile-menu-btn{display:none;background:none;border:none;cursor:pointer;padding:8px;z-index:101}
        .hamburger{width:22px;height:16px;position:relative;display:flex;flex-direction:column;justify-content:space-between}
        .ham-line{display:block;height:2px;background:#003A75;border-radius:1px;transition:all 0.3s;transform-origin:center}
        .ham-top-open{transform:translateY(7px) rotate(45deg)}
        .ham-mid-open{opacity:0}
        .ham-bot-open{transform:translateY(-7px) rotate(-45deg)}
        .mobile-nav{display:none;flex-direction:column;background:#FAF7F2;padding:0 24px;max-height:0;overflow:hidden;transition:max-height 0.35s ease,padding 0.35s ease;border-bottom:1px solid rgba(45,62,54,0.04)}
        .mobile-nav-open{max-height:420px;padding:8px 24px 20px}
        .mobile-nav-link{font-family:'Source Sans 3',sans-serif;font-size:15px;font-weight:500;color:#4A5A6A;text-decoration:none;padding:13px 0;border-bottom:1px solid rgba(45,62,54,0.04);display:block}
        .mobile-nav-active{color:#003A75;font-weight:700}

        /* HERO */
        .hero-section{min-height:100vh;display:flex;align-items:center;background:linear-gradient(170deg,#003A75 0%,#002452 60%,#001838 100%);position:relative;overflow:hidden}
        .hero-grid{display:grid;grid-template-columns:1fr auto;gap:48px;align-items:center}
        .hero-photo{opacity:0;transform:translateY(30px);transition:all 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s}
        .hero-img{width:320px;height:400px;object-fit:cover;object-position:center top;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
        .story-photos{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0 40px 36px}
        .story-photos-single{grid-template-columns:1fr;max-width:300px}
        .story-photo{width:100%;border-radius:8px;object-fit:contain}
        .story-photo-tall{object-fit:contain}
        .hero-dots{position:absolute;inset:0;opacity:0.04;background-image:radial-gradient(circle at 2px 2px,rgba(255,255,255,0.4) 1px,transparent 0);background-size:32px 32px}
        .hero-glow{position:absolute;top:-20%;right:-10%;width:60%;height:140%;background:radial-gradient(ellipse,rgba(184,134,11,0.07) 0%,transparent 70%);pointer-events:none}
        .hero-glow-2{position:absolute;bottom:-10%;left:-5%;width:40%;height:60%;background:radial-gradient(ellipse,rgba(184,134,11,0.04) 0%,transparent 70%);pointer-events:none}
        .hero-content{max-width:1200px;margin:0 auto;padding:120px 24px 80px;position:relative;width:100%}
        .hero-text{opacity:0;transform:translateY(30px);transition:all 0.9s cubic-bezier(0.22,1,0.36,1)}
        .hero-visible{opacity:1!important;transform:translateY(0)!important}
        .hero-heading{font-family:'DM Serif Display',serif;font-size:clamp(34px,5.5vw,66px);color:#FAF7F2;line-height:1.08;letter-spacing:-0.025em;margin:0 0 28px}
        .hero-sub{font-family:'Source Serif 4',serif;font-size:clamp(16px,1.9vw,20px);color:rgba(250,247,242,0.6);line-height:1.65;max-width:560px;margin:0 0 40px}
        .hero-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;margin-top:52px;opacity:0;transform:translateY(20px);transition:all 0.9s cubic-bezier(0.22,1,0.36,1) 0.35s}
        .hero-stats-visible{opacity:1!important;transform:translateY(0)!important}
        .hero-stat{padding:22px 20px;background:rgba(250,247,242,0.035);border-left:1px solid rgba(250,247,242,0.05)}
        .hero-stat:first-child{border-left:none}
        .stat-num{font-family:'DM Serif Display',serif;font-size:clamp(26px,3vw,36px);color:#F7CF3D;line-height:1}
        .stat-label{font-family:'Source Sans 3',sans-serif;font-size:12px;color:rgba(250,247,242,0.4);margin-top:8px;letter-spacing:0.03em;line-height:1.4}

        /* SHARED */
        .section-heading{font-family:'DM Serif Display',serif;font-size:clamp(28px,4.2vw,46px);line-height:1.12;letter-spacing:-0.02em}
        .section-heading.dark{color:#003A75}
        .section-heading.light{color:#FAF7F2}
        .section-intro{font-family:'Source Serif 4',serif;font-size:17px;line-height:1.65;max-width:560px;margin:12px 0 52px}
        .section-intro.dark{color:#4A5A6A}
        .section-intro.light{color:rgba(250,247,242,0.5)}
        .subsection-heading{font-family:'DM Serif Display',serif;font-size:23px;color:#003A75;margin:52px 0 18px}

        /* BUTTONS */
        .btn-primary{font-family:'Source Sans 3',sans-serif;font-size:15px;font-weight:600;color:#002452;background:#F7CF3D;padding:14px 30px;border-radius:6px;text-decoration:none;letter-spacing:0.01em;transition:all 0.2s;display:inline-block}
        .btn-primary:hover{background:#d4b135;opacity:1!important}
        .btn-ghost{font-family:'Source Sans 3',sans-serif;font-size:15px;font-weight:600;color:#FAF7F2;background:rgba(250,247,242,0.06);border:1px solid rgba(250,247,242,0.14);padding:14px 30px;border-radius:6px;text-decoration:none;transition:all 0.2s;display:inline-block}
        .btn-ghost:hover{background:rgba(250,247,242,0.1);opacity:1!important}
        .btn-dark{font-family:'Source Sans 3',sans-serif;font-size:16px;font-weight:600;color:#FAF7F2;background:#003A75;padding:16px 40px;border-radius:6px;text-decoration:none;transition:all 0.2s}
        .btn-dark:hover{background:#002452;opacity:1!important}

        /* TIMELINE */
        .timeline{position:relative;padding-left:36px}
        .timeline-line{position:absolute;left:5px;top:8px;bottom:8px;width:2px;background:linear-gradient(to bottom,#F7CF3D,rgba(184,134,11,0.06))}
        .timeline-item{margin-bottom:42px;position:relative}
        .timeline-item:last-child{margin-bottom:0}
        .timeline-dot{position:absolute;left:-41px;top:6px;width:12px;height:12px;border-radius:50%;background:#FAF7F2;border:2.5px solid #003A75}
        .timeline-dot-active{background:#F7CF3D!important;border-color:#F7CF3D!important}
        .timeline-year{font-family:'Source Sans 3',sans-serif;font-size:20px;font-weight:700;color:#F7CF3D;letter-spacing:0.08em;margin-bottom:5px}
        .timeline-title{font-family:'DM Serif Display',serif;font-size:20px;color:#003A75;margin:0 0 8px;line-height:1.3}
        .timeline-text{font-family:'Source Serif 4',serif;font-size:16px;color:#4A5A6A;line-height:1.7;margin:0}
        .pull-quote{margin-top:52px;padding:28px 32px;background:rgba(45,62,54,0.03);border-radius:8px;border-left:3px solid #F7CF3D;font-family:'Source Serif 4',serif;font-size:17px;color:#003A75;line-height:1.7;font-style:italic}

        /* PRIORITIES */
        .priority-card{background:rgba(250,247,242,0.025);padding:22px 26px;cursor:pointer;border-radius:6px;transition:all 0.25s;border:1px solid rgba(250,247,242,0.03)}
        .priority-expanded{background:rgba(250,247,242,0.07)!important;border-color:rgba(184,134,11,0.22)!important}
        .priority-title{font-family:'DM Serif Display',serif;font-size:clamp(17px,1.8vw,20px);color:#FAF7F2;margin:0 0 4px;line-height:1.3}
        .priority-summary{font-family:'Source Sans 3',sans-serif;font-size:14px;color:rgba(250,247,242,0.42);margin:0;line-height:1.5}
        .priority-detail-wrap{overflow:hidden;transition:max-height 0.4s ease}
        .priority-detail{font-family:'Source Serif 4',serif;font-size:15px;color:rgba(250,247,242,0.68);margin:16px 0 0;line-height:1.7;border-top:1px solid rgba(250,247,242,0.06);padding-top:16px}
        .priority-toggle{color:rgba(250,247,242,0.22);font-size:24px;font-weight:300;transition:transform 0.25s;flex-shrink:0;margin-top:2px;font-family:'Source Sans 3',sans-serif;line-height:1}

        /* RECORD */
        .civiclens-card{background:#003A75;border-radius:10px;padding:clamp(28px,4vw,48px) clamp(22px,3vw,40px);position:relative;overflow:hidden}
        .civiclens-dots{position:absolute;inset:0;opacity:0.03;background-image:radial-gradient(circle at 2px 2px,rgba(255,255,255,0.5) 1px,transparent 0);background-size:24px 24px}
        .civiclens-status{display:flex;align-items:center;gap:10px;margin-bottom:24px}
        .civiclens-status span{font-family:'Source Sans 3',sans-serif;font-size:12px;color:rgba(250,247,242,0.45);font-weight:600;letter-spacing:0.08em;text-transform:uppercase}
        .status-dot{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px rgba(74,222,128,0.4);animation:pulse 2s infinite}
        .search-preview{background:rgba(250,247,242,0.05);border-radius:8px;padding:16px 20px;display:flex;align-items:center;gap:12px;border:1px solid rgba(250,247,242,0.06);margin-bottom:24px}
        .search-preview span{font-family:'Source Sans 3',sans-serif;font-size:15px;color:rgba(250,247,242,0.22)}
        .civiclens-desc{font-family:'Source Serif 4',serif;font-size:15px;color:rgba(250,247,242,0.5);line-height:1.7;margin:0 0 24px}
        .record-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
        .record-stat{background:rgba(250,247,242,0.035);border-radius:6px;padding:16px 18px}
        .stat-num-sm{font-family:'DM Serif Display',serif;font-size:clamp(20px,2.2vw,28px);color:#F7CF3D;line-height:1}
        .stat-label-sm{font-family:'Source Sans 3',sans-serif;font-size:12px;color:rgba(250,247,242,0.45);margin-top:6px}
        .stat-sub{font-family:'Source Sans 3',sans-serif;font-size:11px;color:rgba(250,247,242,0.22);margin-top:2px}

        /* COMMUNITY */
        .community-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}
        .community-card{background:#FAF7F2;border-radius:6px;padding:16px 20px;border:1px solid rgba(45,62,54,0.04)}
        .community-org{font-family:'Source Sans 3',sans-serif;font-size:14px;font-weight:700;color:#003A75;margin:0;line-height:1.35}
        .community-role{font-family:'Source Serif 4',serif;font-size:13px;color:#646469}
        .badge-current{background:rgba(74,222,128,0.1);color:#004C98;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;font-family:'Source Sans 3',sans-serif;letter-spacing:0.04em;text-transform:uppercase;white-space:nowrap}
        .career-card{padding:20px 26px;background:#FAF7F2;border-radius:8px;border-left:3px solid #F7CF3D}
        .career-title{font-family:'Source Sans 3',sans-serif;font-size:15px;font-weight:700;color:#003A75;line-height:1.3}
        .career-org{font-family:'Source Sans 3',sans-serif;font-size:13px;font-weight:600;color:#F7CF3D;margin-top:2px}
        .career-desc{font-family:'Source Serif 4',serif;font-size:14px;color:#646469;margin-top:6px;line-height:1.5}
        .education-card{margin-top:20px;padding:20px 26px;background:#FAF7F2;border-radius:8px;border-left:3px solid #003A75}
        .policy-card{margin-top:10px;padding:20px 26px;background:#FAF7F2;border-radius:8px;border-left:3px solid #F7CF3D}
        .education-label{font-family:'Source Sans 3',sans-serif;font-size:12px;font-weight:600;color:#646469;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px}
        .education-list{font-family:'Source Serif 4',serif;font-size:15px;color:#003A75;line-height:1.8}

        /* JOIN */
        .join-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:680px;margin:0 auto}
        .join-card{background:white;border-radius:8px;padding:30px 22px;border:1px solid rgba(45,62,54,0.05);text-align:center}
        .join-title{font-family:'Source Sans 3',sans-serif;font-size:16px;font-weight:700;color:#003A75;margin:0 0 6px}
        .join-desc{font-family:'Source Serif 4',serif;font-size:14px;color:#646469;margin:0;line-height:1.5}

        /* FOOTER */
        .footer-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:32px}
        .footer-brand{font-family:'DM Serif Display',serif;font-size:20px;color:#FAF7F2;margin-bottom:8px}
        .footer-sub{font-family:'Source Sans 3',sans-serif;font-size:13px;color:rgba(250,247,242,0.3);line-height:1.6}
        .footer-links{font-family:'Source Sans 3',sans-serif;font-size:13px;color:rgba(250,247,242,0.3);line-height:2.2;display:flex;gap:28px}
        .footer-link{color:rgba(250,247,242,0.4);text-decoration:none;transition:color 0.2s}
        .footer-link:hover{color:rgba(250,247,242,0.7);opacity:1!important}
        .footer-legal{font-family:'Source Sans 3',sans-serif;font-size:11px;color:rgba(250,247,242,0.18);line-height:1.7;text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid rgba(250,247,242,0.04)}

        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}

        @media(max-width:768px){
          .nav-links{display:none!important}
          .mobile-menu-btn{display:block!important}
          .mobile-nav{display:flex}
          .hero-grid{grid-template-columns:1fr!important}
          .hero-photo{text-align:center}
          .hero-img{width:240px;height:300px}
          .hero-stats{grid-template-columns:repeat(2,1fr)!important}
          .record-stats{grid-template-columns:1fr!important}
          .join-grid{grid-template-columns:1fr!important}
          .community-grid{grid-template-columns:1fr!important}
          .footer-top{flex-direction:column}
          .story-photos{grid-template-columns:1fr;margin-left:36px}
          .story-photo{max-height:250px}
        }
        @media(max-width:480px){
          .hero-stats{grid-template-columns:1fr!important}
          .hero-stat{border-left:none!important;border-top:1px solid rgba(250,247,242,0.05)}
          .hero-stat:first-child{border-top:none}
          .nav-badge{display:none}
        }
      `}</style>
      <Nav active={active} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Hero />
      <Story />
      <Priorities />
      <Record />
      <Community />
      <Espanol />
      <Join />
      <Footer />
    </div>
  );
}
