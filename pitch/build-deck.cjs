const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");

// Icon imports
const { FaArrowRight, FaCheckCircle } = require("react-icons/fa");

// ─── Color Palette: Midnight Executive ───
const C = {
  navy:      "1E2761",
  darkNavy:  "151D47",
  deepNavy:  "0F1535",
  ice:       "CADCFC",
  white:     "FFFFFF",
  lightGray: "E8EBF5",
  midGray:   "8892B0",
  accent:    "4A90D9",
  accentAlt: "64DFDF",
  red:       "E74C3C",
  amber:     "F39C12",
  green:     "2ECC71",
  charcoal:  "2C3E50",
};

// ─── Helpers ───
function renderIconSvg(IconComponent, color, size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64Png(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}

const makeCardShadow = () => ({
  type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.15
});

const makeShadow = () => ({
  type: "outer", blur: 8, offset: 2, angle: 135, color: "000000", opacity: 0.2
});

async function buildDeck() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Semantic Authority";
  pres.title = "Semantic Authority — Pitch Deck";

  // ═══════════════════════════════════════════════════════════════════
  // SLIDE 1 — TITLE
  // "Your AI agents are shipping fast. But are they shipping right?"
  // ═══════════════════════════════════════════════════════════════════
  let s1 = pres.addSlide();
  s1.background = { color: C.deepNavy };

  // Subtle geometric accent — top-right corner
  s1.addShape(pres.shapes.RECTANGLE, {
    x: 7.5, y: 0, w: 2.5, h: 0.06, fill: { color: C.accent }
  });
  s1.addShape(pres.shapes.RECTANGLE, {
    x: 9.94, y: 0, w: 0.06, h: 2.5, fill: { color: C.accent }
  });

  s1.addText("SEMANTIC", {
    x: 0.8, y: 1.0, w: 8.4, h: 0.9,
    fontSize: 52, fontFace: "Arial Black", color: C.white,
    charSpacing: 8, bold: true, margin: 0
  });
  s1.addText("AUTHORITY", {
    x: 0.8, y: 1.75, w: 8.4, h: 0.9,
    fontSize: 52, fontFace: "Arial Black", color: C.accent,
    charSpacing: 8, bold: true, margin: 0
  });

  s1.addText("Your AI agents are shipping fast.\nBut are they shipping right?", {
    x: 0.8, y: 3.0, w: 8.4, h: 0.9,
    fontSize: 20, fontFace: "Calibri", color: C.ice, margin: 0
  });

  // Bottom bar
  s1.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 4.85, w: 10, h: 0.775, fill: { color: C.navy }
  });
  s1.addText("Machine-enforceable governance for AI-assisted development", {
    x: 0.8, y: 4.95, w: 8.4, h: 0.6,
    fontSize: 14, fontFace: "Calibri", color: C.midGray, margin: 0
  });

  // ═══════════════════════════════════════════════════════════════════
  // SLIDE 2 — THE $200K BUG
  // Lead with a concrete, visceral scenario
  // ═══════════════════════════════════════════════════════════════════
  let s2 = pres.addSlide();
  s2.background = { color: C.white };

  // Left accent bar
  s2.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.08, h: 5.625, fill: { color: C.red }
  });

  s2.addText("The $200K Bug Nobody Saw Coming", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 30, fontFace: "Arial Black", color: C.navy, margin: 0
  });

  // Scenario narrative cards
  const scenario = [
    { text: "A team ships 40 PRs a week with AI agents. Velocity is through the roof.", icon: "✓", color: C.green, bg: "F0FFF4" },
    { text: "A Copilot-generated PR bypasses a payment validation check that was never written down.", icon: "!", color: C.amber, bg: "FFFBEB" },
    { text: "A duplicate payment goes out. The client calls. Legal gets involved.", icon: "✕", color: C.red, bg: "FEF2F2" },
    { text: "The fix takes a week. The trust takes a year.", icon: "✕", color: C.red, bg: "FEF2F2" },
  ];

  let sy = 1.3;
  for (const item of scenario) {
    s2.addShape(pres.shapes.RECTANGLE, {
      x: 0.8, y: sy, w: 8.4, h: 0.65,
      fill: { color: item.bg }, shadow: makeCardShadow()
    });
    s2.addShape(pres.shapes.RECTANGLE, {
      x: 0.8, y: sy, w: 0.06, h: 0.65,
      fill: { color: item.color }
    });
    s2.addText(item.text, {
      x: 1.15, y: sy, w: 7.85, h: 0.65,
      fontSize: 14, fontFace: "Calibri", color: C.charcoal,
      valign: "middle", margin: 0
    });
    sy += 0.78;
  }

  // Bottom insight
  s2.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 4.5, w: 8.4, h: 0.75,
    fill: { color: "FDF2F2" }
  });
  s2.addText([
    { text: "This wasn't a code quality problem. ", options: { color: C.navy, bold: true } },
    { text: "The tests passed. The linter passed. The agent did exactly what it was asked to do. ", options: { color: C.charcoal } },
    { text: "Nobody told the agent what must never happen.", options: { color: C.red, bold: true } }
  ], {
    x: 1.0, y: 4.5, w: 8.0, h: 0.75,
    fontSize: 13, fontFace: "Calibri", valign: "middle", margin: 0
  });

  // ═══════════════════════════════════════════════════════════════════
  // SLIDE 3 — WHAT THIS COSTS YOU TODAY
  // Role-specific pain table
  // ═══════════════════════════════════════════════════════════════════
  let s3 = pres.addSlide();
  s3.background = { color: C.deepNavy };

  s3.addText("What This Costs You Today", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 30, fontFace: "Arial Black", color: C.white, margin: 0
  });

  const painCards = [
    {
      role: "CTO / VP Eng",
      pain: "Agents ship code that violates constraints nobody documented. You find out in production.",
      cost: "Incidents, rework, eroded trust in AI tooling",
      color: C.red
    },
    {
      role: "CPO / VP Product",
      pain: "Your roadmap says \"don't build X\" but an agent builds it anyway because the PRD isn't in the codebase.",
      cost: "Scope creep, wasted sprints, diluted product focus",
      color: C.amber
    },
    {
      role: "Eng Manager",
      pain: "Three squads make incompatible assumptions about the same system. You discover it during integration.",
      cost: "Coordination tax, missed deadlines, team friction",
      color: C.accent
    }
  ];

  let cy = 1.3;
  for (const card of painCards) {
    s3.addShape(pres.shapes.RECTANGLE, {
      x: 0.8, y: cy, w: 8.4, h: 1.2,
      fill: { color: C.navy }, shadow: makeCardShadow()
    });
    s3.addShape(pres.shapes.RECTANGLE, {
      x: 0.8, y: cy, w: 0.06, h: 1.2,
      fill: { color: card.color }
    });
    // Role label
    s3.addText(card.role, {
      x: 1.1, y: cy + 0.1, w: 2.5, h: 0.35,
      fontSize: 14, fontFace: "Calibri", color: card.color,
      bold: true, margin: 0
    });
    // Pain description
    s3.addText(card.pain, {
      x: 1.1, y: cy + 0.4, w: 7.8, h: 0.35,
      fontSize: 13, fontFace: "Calibri", color: C.ice, margin: 0
    });
    // Cost
    s3.addText(card.cost, {
      x: 1.1, y: cy + 0.8, w: 7.8, h: 0.3,
      fontSize: 12, fontFace: "Calibri", color: C.midGray,
      italic: true, margin: 0
    });
    cy += 1.35;
  }

  // Bottom line
  s3.addText([
    { text: "None of these are solved by better tests, better prompts, or better agents.", options: { bold: true, color: C.white } },
  ], {
    x: 0.8, y: 4.9, w: 8.4, h: 0.5,
    fontSize: 15, fontFace: "Calibri", margin: 0
  });

  // ═══════════════════════════════════════════════════════════════════
  // SLIDE 4 — THE ROOT CAUSE
  // The rules aren't wrong — they're invisible
  // ═══════════════════════════════════════════════════════════════════
  let s4 = pres.addSlide();
  s4.background = { color: C.white };

  s4.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.08, h: 5.625, fill: { color: C.accent }
  });

  s4.addText("The Rules Aren't Wrong.\nThey're Invisible.", {
    x: 0.8, y: 0.3, w: 8.4, h: 1.0,
    fontSize: 30, fontFace: "Arial Black", color: C.navy, margin: 0
  });

  // Where rules live today vs where agents look
  const leftCol = [
    { label: "Confluence page", color: C.midGray },
    { label: "PRD in Google Docs", color: C.midGray },
    { label: "Slack thread from 6 months ago", color: C.midGray },
    { label: "\"Everyone just knows\"", color: C.midGray },
  ];

  // "Where rules live today" column
  s4.addText("WHERE RULES LIVE TODAY", {
    x: 0.8, y: 1.6, w: 4.0, h: 0.3,
    fontSize: 10, fontFace: "Calibri", color: C.midGray,
    bold: true, charSpacing: 2, margin: 0
  });

  let ly = 2.0;
  for (const item of leftCol) {
    s4.addShape(pres.shapes.RECTANGLE, {
      x: 0.8, y: ly, w: 3.8, h: 0.5,
      fill: { color: C.lightGray }
    });
    s4.addShape(pres.shapes.RECTANGLE, {
      x: 0.8, y: ly, w: 0.05, h: 0.5,
      fill: { color: C.red }
    });
    s4.addText(item.label, {
      x: 1.05, y: ly, w: 3.35, h: 0.5,
      fontSize: 13, fontFace: "Calibri", color: C.charcoal,
      valign: "middle", margin: 0
    });
    ly += 0.58;
  }

  // Arrow
  const arrowIcon = await iconToBase64Png(FaArrowRight, `#${C.accent}`, 256);
  s4.addImage({ data: arrowIcon, x: 4.7, y: 2.7, w: 0.5, h: 0.5 });

  // "Where agents look" column
  s4.addText("WHERE AGENTS LOOK", {
    x: 5.4, y: 1.6, w: 4.0, h: 0.3,
    fontSize: 10, fontFace: "Calibri", color: C.accent,
    bold: true, charSpacing: 2, margin: 0
  });

  s4.addShape(pres.shapes.RECTANGLE, {
    x: 5.4, y: 2.0, w: 3.8, h: 2.32,
    fill: { color: C.navy }, shadow: makeCardShadow()
  });
  s4.addShape(pres.shapes.RECTANGLE, {
    x: 5.4, y: 2.0, w: 0.05, h: 2.32,
    fill: { color: C.green }
  });
  s4.addText("The codebase.", {
    x: 5.7, y: 2.2, w: 3.2, h: 0.5,
    fontSize: 20, fontFace: "Calibri", color: C.white,
    bold: true, valign: "middle", margin: 0
  });
  s4.addText("Tests, README, source files,\nand whatever context\nyou give them.", {
    x: 5.7, y: 2.8, w: 3.2, h: 0.9,
    fontSize: 13, fontFace: "Calibri", color: C.ice, margin: 0
  });
  s4.addText("If the rule isn't here,\nit doesn't exist.", {
    x: 5.7, y: 3.6, w: 3.2, h: 0.5,
    fontSize: 13, fontFace: "Calibri", color: C.amber,
    bold: true, italic: true, margin: 0
  });

  // Bottom insight
  s4.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 4.6, w: 8.4, h: 0.7,
    fill: { color: "F0F4FF" }
  });
  s4.addText("The solution: make the rules explicit, machine-readable, and enforceable before code merges.", {
    x: 1.0, y: 4.6, w: 8.0, h: 0.7,
    fontSize: 15, fontFace: "Calibri", color: C.navy,
    bold: true, valign: "middle", margin: 0
  });

  // ═══════════════════════════════════════════════════════════════════
  // SLIDE 5 — THE SOLUTION: MEANING.yaml
  // One file, three enforcement levels
  // ═══════════════════════════════════════════════════════════════════
  let s5 = pres.addSlide();
  s5.background = { color: C.deepNavy };

  s5.addText("One File. Three Enforcement Levels.", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 30, fontFace: "Arial Black", color: C.white, margin: 0
  });

  s5.addText([
    { text: "MEANING.yaml", options: { fontFace: "Consolas", color: C.accentAlt, bold: true } },
    { text: " lives in your repo and declares:", options: { color: C.ice } }
  ], {
    x: 0.8, y: 1.0, w: 8.4, h: 0.4,
    fontSize: 16, fontFace: "Calibri", margin: 0
  });

  // Four declare cards in 2x2 grid
  const declares = [
    { title: "What the system is for", desc: "Testable success criteria", icon: "→" },
    { title: "What it is NOT for", desc: "Explicit scope boundaries agents must respect", icon: "✕" },
    { title: "What must never be violated", desc: "Constraints with IDs, owners, and enforcement levels", icon: "!" },
    { title: "What trade-offs were chosen", desc: "And when to revisit them", icon: "↔" },
  ];

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 0.8 + col * 4.4;
    const ccy = 1.7 + row * 1.15;

    s5.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: ccy, w: 4.0, h: 0.95,
      fill: { color: C.navy }, shadow: makeCardShadow()
    });
    s5.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: ccy, w: 0.06, h: 0.95,
      fill: { color: C.accentAlt }
    });
    s5.addText(declares[i].title, {
      x: cx + 0.25, y: ccy + 0.12, w: 3.5, h: 0.35,
      fontSize: 14, fontFace: "Calibri", color: C.white, bold: true, margin: 0
    });
    s5.addText(declares[i].desc, {
      x: cx + 0.25, y: ccy + 0.48, w: 3.5, h: 0.35,
      fontSize: 12, fontFace: "Calibri", color: C.midGray, margin: 0
    });
  }

  // Enforcement levels bar
  s5.addText("THREE ENFORCEMENT LEVELS", {
    x: 0.8, y: 4.15, w: 8.4, h: 0.3,
    fontSize: 11, fontFace: "Calibri", color: C.midGray,
    bold: true, charSpacing: 2, margin: 0
  });

  const levels = [
    { label: "BLOCK", desc: "PR cannot merge", example: "\"Invoice must never be paid twice\"", color: C.red },
    { label: "WARN", desc: "PR flagged, owner acknowledges", example: "\"Search P95 must stay under 500ms\"", color: C.amber },
    { label: "OBSERVE", desc: "Logged for trend analysis", example: "\"Prefer async for external calls\"", color: C.accent },
  ];

  for (let i = 0; i < 3; i++) {
    const lx = 0.8 + i * 3.1;
    s5.addShape(pres.shapes.RECTANGLE, {
      x: lx, y: 4.5, w: 2.7, h: 0.8,
      fill: { color: C.navy }
    });
    s5.addShape(pres.shapes.RECTANGLE, {
      x: lx, y: 4.5, w: 2.7, h: 0.05,
      fill: { color: levels[i].color }
    });
    s5.addText([
      { text: levels[i].label, options: { bold: true, color: levels[i].color, fontSize: 13 } },
      { text: `  ${levels[i].desc}`, options: { color: C.ice, fontSize: 11 } }
    ], {
      x: lx + 0.15, y: 4.55, w: 2.4, h: 0.3,
      fontFace: "Calibri", valign: "middle", margin: 0
    });
    s5.addText(levels[i].example, {
      x: lx + 0.15, y: 4.85, w: 2.4, h: 0.35,
      fontSize: 10, fontFace: "Calibri", color: C.midGray,
      italic: true, margin: 0
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // SLIDE 6 — WHAT A CONSTRAINT LOOKS LIKE
  // ═══════════════════════════════════════════════════════════════════
  let s6 = pres.addSlide();
  s6.background = { color: C.deepNavy };

  s6.addText("A Constraint Is Not a Guideline", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 30, fontFace: "Arial Black", color: C.white, margin: 0
  });

  // Code block background
  s6.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 1.3, w: 5.5, h: 3.0,
    fill: { color: "0D1117" }, shadow: makeShadow()
  });

  // Code content
  const codeLines = [
    { key: "id", value: "C-FIN-NO-DOUBLE-PAY-001", keyColor: C.accentAlt, valColor: C.amber },
    { key: "description", value: '"Invoice must never be paid twice\n                for the same vendor"', keyColor: C.accentAlt, valColor: "A8D8A8" },
    { key: "enforcement", value: "block", keyColor: C.accentAlt, valColor: C.red },
    { key: "owner", value: "finance-engineering", keyColor: C.accentAlt, valColor: "A8D8A8" },
    { key: "rationale", value: '"Duplicate payments cause direct\n                financial loss"', keyColor: C.accentAlt, valColor: "A8D8A8" },
    { key: "confidence", value: "high", keyColor: C.accentAlt, valColor: C.green },
  ];

  let codey = 1.45;
  for (const line of codeLines) {
    s6.addText([
      { text: `${line.key}: `, options: { color: line.keyColor, fontFace: "Consolas", fontSize: 13 } },
      { text: line.value, options: { color: line.valColor, fontFace: "Consolas", fontSize: 13 } }
    ], {
      x: 1.2, y: codey, w: 4.8, h: 0.4,
      margin: 0
    });
    codey += 0.4;
  }

  // Right side — what makes this different
  const props = [
    { label: "Has an ID", desc: "Agents cite it in PRs" },
    { label: "Has an owner", desc: "Someone is accountable" },
    { label: "Has enforcement", desc: "Block, warn, or observe" },
    { label: "Has rationale", desc: "New hires know why on day one" },
  ];

  let ppy = 1.5;
  for (const prop of props) {
    s6.addShape(pres.shapes.RECTANGLE, {
      x: 6.8, y: ppy, w: 2.6, h: 0.65,
      fill: { color: C.navy }
    });
    s6.addText(prop.label, {
      x: 7.0, y: ppy + 0.05, w: 2.2, h: 0.3,
      fontSize: 14, fontFace: "Calibri", color: C.accentAlt,
      bold: true, margin: 0
    });
    s6.addText(prop.desc, {
      x: 7.0, y: ppy + 0.32, w: 2.2, h: 0.25,
      fontSize: 11, fontFace: "Calibri", color: C.midGray, margin: 0
    });
    ppy += 0.78;
  }

  // Bottom callout
  s6.addText("A machine-enforceable boundary with an owner, a rationale, and a CI gate.", {
    x: 0.8, y: 4.8, w: 8.4, h: 0.5,
    fontSize: 14, fontFace: "Calibri", color: C.midGray,
    italic: true, margin: 0
  });

  // ═══════════════════════════════════════════════════════════════════
  // SLIDE 7 — WHAT CHANGES FOR YOUR ORG
  // Role-specific value propositions
  // ═══════════════════════════════════════════════════════════════════
  let s7 = pres.addSlide();
  s7.background = { color: C.white };

  s7.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.08, h: 5.625, fill: { color: C.accent }
  });

  s7.addText("What Changes for Your Org", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 30, fontFace: "Arial Black", color: C.navy, margin: 0
  });

  const valueCards = [
    {
      role: "FOR PRODUCT LEADERS",
      value: "Your non-goals finally have teeth. When you say \"we are not building multi-currency in v1,\" that boundary lives in the codebase — not in a Confluence page nobody reads.",
      benefit: "AI agents see it before they write a single line. Drift reports show where intent diverges from implementation.",
      color: C.accent
    },
    {
      role: "FOR ENGINEERING LEADERS",
      value: "Constraints get IDs, owners, and enforcement levels — like policies in production, but for meaning. CI catches violations the same way it catches test failures.",
      benefit: "Agents cite constraint IDs in PRs. New hires read MEANING.yaml on day one and understand what matters.",
      color: "0D9488"
    },
    {
      role: "FOR ENG MANAGERS",
      value: "Cross-team coordination becomes explicit. When Team A's constraint affects Team B's service, that dependency is declared, not discovered during a 2am incident.",
      benefit: "Drift reports replace \"I thought you knew\" with \"here's the constraint ID.\"",
      color: C.navy
    }
  ];

  let vy = 1.2;
  for (const card of valueCards) {
    s7.addShape(pres.shapes.RECTANGLE, {
      x: 0.8, y: vy, w: 8.4, h: 1.3,
      fill: { color: C.lightGray }, shadow: makeCardShadow()
    });
    s7.addShape(pres.shapes.RECTANGLE, {
      x: 0.8, y: vy, w: 0.06, h: 1.3,
      fill: { color: card.color }
    });
    // Role label
    s7.addText(card.role, {
      x: 1.1, y: vy + 0.08, w: 3.0, h: 0.3,
      fontSize: 11, fontFace: "Calibri", color: card.color,
      bold: true, charSpacing: 2, margin: 0
    });
    // Value statement
    s7.addText(card.value, {
      x: 1.1, y: vy + 0.35, w: 7.8, h: 0.45,
      fontSize: 12, fontFace: "Calibri", color: C.charcoal, margin: 0
    });
    // Benefit
    s7.addText(card.benefit, {
      x: 1.1, y: vy + 0.82, w: 7.8, h: 0.38,
      fontSize: 12, fontFace: "Calibri", color: C.navy,
      bold: true, margin: 0
    });
    vy += 1.45;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SLIDE 8 — HOW TEAMS ADOPT IT
  // Day 1 through Week 5+ — zero to governance
  // ═══════════════════════════════════════════════════════════════════
  let s8 = pres.addSlide();
  s8.background = { color: C.deepNavy };

  s8.addText("Start in 5 Minutes. Enforce in a Sprint.", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 28, fontFace: "Arial Black", color: C.white, margin: 0
  });

  const timeline = [
    {
      when: "DAY 1",
      what: "meaning init — 5-min wizard scaffolds MEANING.yaml",
      disruption: "Zero. It's a YAML file.",
      color: C.green
    },
    {
      when: "WEEK 1",
      what: "Team reads it. PMs refine goals and non-goals.",
      disruption: "A useful conversation.",
      color: C.green
    },
    {
      when: "WEEK 2",
      what: "meaning context — AI agents get auto-generated guardrails",
      disruption: "Agents get smarter, not slower.",
      color: C.accent
    },
    {
      when: "WEEK 3",
      what: "CI runs validation. Warnings in PRs. No blocking.",
      disruption: "Visibility without friction.",
      color: C.amber
    },
    {
      when: "WEEK 5+",
      what: "Block-level constraints fail the build.",
      disruption: "Governance that actually works.",
      color: C.red
    }
  ];

  let ty = 1.2;
  for (let i = 0; i < timeline.length; i++) {
    const step = timeline[i];

    // Timeline dot
    s8.addShape(pres.shapes.OVAL, {
      x: 0.95, y: ty + 0.12, w: 0.35, h: 0.35,
      fill: { color: step.color }
    });

    // Connector line
    if (i < timeline.length - 1) {
      s8.addShape(pres.shapes.LINE, {
        x: 1.125, y: ty + 0.5, w: 0, h: 0.35,
        line: { color: C.midGray, width: 1.5, dashType: "dash" }
      });
    }

    // When
    s8.addText(step.when, {
      x: 1.6, y: ty + 0.02, w: 1.5, h: 0.3,
      fontSize: 12, fontFace: "Calibri", color: step.color,
      bold: true, charSpacing: 1, margin: 0
    });
    // What
    s8.addText(step.what, {
      x: 3.0, y: ty + 0.02, w: 4.5, h: 0.3,
      fontSize: 13, fontFace: "Calibri", color: C.ice, margin: 0
    });
    // Disruption
    s8.addText(step.disruption, {
      x: 7.5, y: ty + 0.02, w: 2.0, h: 0.3,
      fontSize: 11, fontFace: "Calibri", color: C.midGray,
      italic: true, align: "right", margin: 0
    });

    ty += 0.68;
  }

  // BRD callout
  s8.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 4.7, w: 8.4, h: 0.6,
    fill: { color: C.navy }
  });
  s8.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 4.7, w: 0.06, h: 0.6,
    fill: { color: C.accentAlt }
  });
  s8.addText([
    { text: "Already have a BRD or PRD? ", options: { bold: true, color: C.white } },
    { text: "Feed it to any LLM with the included prompt template. 80% complete MEANING.yaml in minutes.", options: { color: C.ice } }
  ], {
    x: 1.1, y: 4.7, w: 7.9, h: 0.6,
    fontSize: 13, fontFace: "Calibri", valign: "middle", margin: 0
  });

  // ═══════════════════════════════════════════════════════════════════
  // SLIDE 9 — WHY THIS MATTERS NOW
  // Urgency and competitive framing
  // ═══════════════════════════════════════════════════════════════════
  let s9 = pres.addSlide();
  s9.background = { color: C.white };

  s9.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.08, h: 5.625, fill: { color: C.accent }
  });

  s9.addText("Why This Matters Now", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 30, fontFace: "Arial Black", color: C.navy, margin: 0
  });

  // Two-column comparison: Orgs WITH vs WITHOUT
  s9.addText("ORGS THAT FIGURE THIS OUT EARLY", {
    x: 0.8, y: 1.3, w: 4.2, h: 0.3,
    fontSize: 10, fontFace: "Calibri", color: C.green,
    bold: true, charSpacing: 2, margin: 0
  });

  const withItems = [
    "Ship faster — agents stay inside the lines without manual review",
    "Break less — constraints catch violations before production",
    "Retain trust — customers and teams see governed velocity",
    "Onboard faster — new hires read MEANING.yaml day one"
  ];

  let wy = 1.7;
  for (const item of withItems) {
    s9.addShape(pres.shapes.RECTANGLE, {
      x: 0.8, y: wy, w: 4.2, h: 0.55,
      fill: { color: "F0FFF4" }
    });
    s9.addShape(pres.shapes.RECTANGLE, {
      x: 0.8, y: wy, w: 0.05, h: 0.55,
      fill: { color: C.green }
    });
    s9.addText(item, {
      x: 1.05, y: wy, w: 3.75, h: 0.55,
      fontSize: 12, fontFace: "Calibri", color: C.charcoal,
      valign: "middle", margin: 0
    });
    wy += 0.62;
  }

  s9.addText("ORGS THAT DON'T", {
    x: 5.2, y: 1.3, w: 4.2, h: 0.3,
    fontSize: 10, fontFace: "Calibri", color: C.red,
    bold: true, charSpacing: 2, margin: 0
  });

  const withoutItems = [
    "Spend years cleaning up drift they can't see yet",
    "Manual PR review becomes the bottleneck again",
    "Cross-team conflicts discovered during integration, not design",
    "AI tooling trust erodes after preventable incidents"
  ];

  let woy = 1.7;
  for (const item of withoutItems) {
    s9.addShape(pres.shapes.RECTANGLE, {
      x: 5.2, y: woy, w: 4.2, h: 0.55,
      fill: { color: "FEF2F2" }
    });
    s9.addShape(pres.shapes.RECTANGLE, {
      x: 5.2, y: woy, w: 0.05, h: 0.55,
      fill: { color: C.red }
    });
    s9.addText(item, {
      x: 5.45, y: woy, w: 3.75, h: 0.55,
      fontSize: 12, fontFace: "Calibri", color: C.charcoal,
      valign: "middle", margin: 0
    });
    woy += 0.62;
  }

  // Bottom emphasis
  s9.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 4.5, w: 8.4, h: 0.7,
    fill: { color: C.navy }
  });
  s9.addText("Every org is adopting AI agents. The question isn't whether drift will happen — it's whether you'll catch it before your customer does.", {
    x: 1.0, y: 4.5, w: 8.0, h: 0.7,
    fontSize: 14, fontFace: "Calibri", color: C.ice,
    valign: "middle", align: "center", bold: true, margin: 0
  });

  // ═══════════════════════════════════════════════════════════════════
  // SLIDE 10 — WHAT EXISTS vs WHAT THIS ADDS
  // Positioning table (shortened)
  // ═══════════════════════════════════════════════════════════════════
  let s10 = pres.addSlide();
  s10.background = { color: C.deepNavy };

  s10.addText("What Exists vs. What This Adds", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 28, fontFace: "Arial Black", color: C.white, margin: 0
  });

  // Table
  const tableHeader = [
    [
      { text: "Artifact", options: { fill: { color: C.accent }, color: C.white, bold: true, fontSize: 13, fontFace: "Calibri", align: "left" } },
      { text: "Declares", options: { fill: { color: C.accent }, color: C.white, bold: true, fontSize: 13, fontFace: "Calibri", align: "left" } },
      { text: "What's Missing", options: { fill: { color: C.accent }, color: C.white, bold: true, fontSize: 13, fontFace: "Calibri", align: "left" } }
    ]
  ];

  const tableRows = [
    ["PRDs", "What to build", "What NOT to build, enforcement"],
    ["ADRs", "Why a decision was made", "Ongoing enforcement, agent consumption"],
    ["OpenAPI / Specs", "Interface shape", "System meaning, trade-offs, non-goals"],
    ["CLAUDE.md", "How agents should work", "What the work must mean"],
    ["Tests", "Behavior correctness", "Intent correctness, scope boundaries"],
  ];

  const allRows = [...tableHeader, ...tableRows.map(r => [
    { text: r[0], options: { fill: { color: C.navy }, color: C.ice, fontSize: 12, fontFace: "Calibri", bold: true } },
    { text: r[1], options: { fill: { color: C.navy }, color: C.ice, fontSize: 12, fontFace: "Calibri" } },
    { text: r[2], options: { fill: { color: C.navy }, color: C.amber, fontSize: 12, fontFace: "Calibri" } }
  ])];

  s10.addTable(allRows, {
    x: 0.8, y: 1.2, w: 8.4,
    colW: [2.0, 3.2, 3.2],
    border: { pt: 0.5, color: C.darkNavy },
    rowH: 0.45
  });

  // Bottom summary
  s10.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 4.2, w: 8.4, h: 0.9,
    fill: { color: C.navy }
  });
  s10.addText([
    { text: "MEANING.yaml", options: { fontFace: "Consolas", color: C.accentAlt, bold: true } },
    { text: " fills the governance gap between intent and implementation.", options: { color: C.ice } }
  ], {
    x: 1.0, y: 4.2, w: 8.0, h: 0.9,
    fontSize: 16, fontFace: "Calibri",
    align: "center", valign: "middle", margin: 0
  });

  // ═══════════════════════════════════════════════════════════════════
  // SLIDE 11 — CLOSING
  // ═══════════════════════════════════════════════════════════════════
  let s11 = pres.addSlide();
  s11.background = { color: C.deepNavy };

  // Geometric accent — matching slide 1
  s11.addShape(pres.shapes.RECTANGLE, {
    x: 7.5, y: 0, w: 2.5, h: 0.06, fill: { color: C.accent }
  });
  s11.addShape(pres.shapes.RECTANGLE, {
    x: 9.94, y: 0, w: 0.06, h: 2.5, fill: { color: C.accent }
  });

  s11.addText("SEMANTIC", {
    x: 0.8, y: 0.8, w: 8.4, h: 0.8,
    fontSize: 44, fontFace: "Arial Black", color: C.white,
    charSpacing: 8, bold: true, margin: 0
  });
  s11.addText("AUTHORITY", {
    x: 0.8, y: 1.45, w: 8.4, h: 0.8,
    fontSize: 44, fontFace: "Arial Black", color: C.accent,
    charSpacing: 8, bold: true, margin: 0
  });

  s11.addText("Make the lines visible, machine-readable, and enforceable.", {
    x: 0.8, y: 2.4, w: 8.4, h: 0.5,
    fontSize: 18, fontFace: "Calibri", color: C.ice, margin: 0
  });

  // Info cards
  const infos = [
    { label: "License", value: "MIT (Open Source)" },
    { label: "Install", value: "npx @semantic-authority/cli init" },
    { label: "GitHub", value: "github.com/ai-native-pm-stack/semantic-authority" },
  ];

  let iy = 3.2;
  for (const info of infos) {
    s11.addText([
      { text: `${info.label}:  `, options: { color: C.midGray, fontSize: 14 } },
      { text: info.value, options: { color: C.ice, fontSize: 14, bold: true } }
    ], {
      x: 0.8, y: iy, w: 8.4, h: 0.35,
      fontFace: "Calibri", margin: 0
    });
    iy += 0.4;
  }

  // Bottom bar with suite context
  s11.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 4.55, w: 10, h: 1.075, fill: { color: C.navy }
  });
  s11.addText([
    { text: "AI Native PM Stack", options: { bold: true, color: C.white, fontSize: 16 } },
  ], {
    x: 0.8, y: 4.65, w: 8.4, h: 0.35,
    fontFace: "Calibri", margin: 0
  });
  s11.addText("semantic-authority  ·  meaning governance for AI-assisted execution", {
    x: 0.8, y: 5.0, w: 8.4, h: 0.3,
    fontSize: 12, fontFace: "Calibri", color: C.midGray, margin: 0
  });

  // ─── Save ───
  const outDir = path.join(__dirname, "out");
  fs.mkdirSync(outDir, { recursive: true });
  await pres.writeFile({ fileName: path.join(outDir, "Semantic_Authority_Pitch_Deck.pptx") });
  console.log("Deck saved: 11 slides with persuasive framing");
}

buildDeck().catch(err => { console.error(err); process.exit(1); });
