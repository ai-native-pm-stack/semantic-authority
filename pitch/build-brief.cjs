const fs = require("fs");
const path = require("path");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
        BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
        TabStopType, TabStopPosition } = require("docx");

// Colors
const NAVY = "1E2761";
const DARK_NAVY = "151D47";
const ICE = "CADCFC";
const MID_GRAY = "8892B0";
const LIGHT_BG = "F4F6FB";
const WHITE = "FFFFFF";
const ACCENT = "4A90D9";
const RED = "E74C3C";
const AMBER = "F39C12";
const GREEN = "2ECC71";

// Borders
const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const thinBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

// Cell margins
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

// Page dimensions (US Letter)
const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN = 1080; // 0.75 inch
const CONTENT_W = PAGE_W - 2 * MARGIN; // 10080

function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: ACCENT, space: 4 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, font: "Calibri", size: 20, color: NAVY, characterSpacing: 80 })]
  });
}

function bodyParagraph(runs, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after !== undefined ? opts.after : 120 },
    alignment: opts.align || AlignmentType.LEFT,
    ...opts.paragraphOpts,
    children: typeof runs === "string"
      ? [new TextRun({ text: runs, font: "Calibri", size: 21, color: "333333" })]
      : runs
  });
}

function makeHeaderRow(cells, widths) {
  return new TableRow({
    children: cells.map((text, i) => new TableCell({
      borders: thinBorders,
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: cellMargins,
      width: { size: widths[i], type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: "Calibri", size: 19, color: WHITE })] })]
    }))
  });
}

function makeRow(cells, widths, opts = {}) {
  return new TableRow({
    children: cells.map((text, i) => new TableCell({
      borders: thinBorders,
      shading: { fill: opts.shading || WHITE, type: ShadingType.CLEAR },
      margins: cellMargins,
      width: { size: widths[i], type: WidthType.DXA },
      children: [new Paragraph({
        children: typeof text === "string"
          ? [new TextRun({ text, font: "Calibri", size: 19, color: "333333" })]
          : text
      })]
    }))
  });
}

async function build() {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } }
      }
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [{
            level: 0, format: LevelFormat.BULLET, text: "\u2022",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 460, hanging: 230 } } }
          }]
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: { top: 720, right: MARGIN, bottom: 720, left: MARGIN }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Table({
                width: { size: CONTENT_W, type: WidthType.DXA },
                columnWidths: [CONTENT_W],
                rows: [new TableRow({
                  children: [new TableCell({
                    borders: noBorders,
                    shading: { fill: NAVY, type: ShadingType.CLEAR },
                    margins: { top: 120, bottom: 80, left: 200, right: 200 },
                    width: { size: CONTENT_W, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        spacing: { after: 40 },
                        children: [new TextRun({ text: "SEMANTIC AUTHORITY", bold: true, font: "Calibri", size: 28, color: WHITE, characterSpacing: 120 })]
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: "Your AI agents are shipping fast. But are they shipping right?", font: "Calibri", size: 18, color: ICE })]
                      })
                    ]
                  })]
                })]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC", space: 4 } },
                spacing: { before: 80 },
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                children: [
                  new TextRun({ text: "Open Source (MIT)  |  npx @semantic-authority/cli init  |  github.com/ai-native-pm-stack/semantic-authority", font: "Calibri", size: 15, color: MID_GRAY }),
                  new TextRun({ text: "\t", font: "Calibri", size: 15 }),
                  new TextRun({ text: "Page ", font: "Calibri", size: 15, color: MID_GRAY }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 15, color: MID_GRAY })
                ]
              })
            ]
          })
        },
        children: [
          // ═══════════════════════════════════════════════
          // THE $200K BUG NOBODY SAW COMING
          // ═══════════════════════════════════════════════
          sectionHeading("The $200K Bug Nobody Saw Coming"),
          bodyParagraph([
            new TextRun({ text: "A team ships 40 PRs a week with AI agents. Velocity is through the roof. Then a Copilot-generated PR bypasses a payment validation check that was never written down. A duplicate payment goes out. The client calls. Legal gets involved. The fix takes a week. The trust takes a year.", font: "Calibri", size: 21, color: "333333" }),
          ]),
          bodyParagraph([
            new TextRun({ text: "This wasn\u2019t a code quality problem.", bold: true, font: "Calibri", size: 21, color: NAVY }),
            new TextRun({ text: " The tests passed. The linter passed. The agent did exactly what it was asked to do. ", font: "Calibri", size: 21, color: "333333" }),
            new TextRun({ text: "The problem was that nobody told the agent what must never happen.", bold: true, font: "Calibri", size: 21, color: RED }),
          ]),
          bodyParagraph([
            new TextRun({ text: "Every engineering org adopting AI agents is exposed to this right now. The question isn\u2019t whether it will happen \u2014 it\u2019s whether you\u2019ll catch it before your customer does.", font: "Calibri", size: 21, color: "333333", italics: true }),
          ]),

          // ═══════════════════════════════════════════════
          // WHAT THIS COSTS YOU TODAY
          // ═══════════════════════════════════════════════
          sectionHeading("What This Costs You Today"),
          new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: [2000, 4440, 3640],
            rows: [
              makeHeaderRow(["If you\u2019re a\u2026", "You\u2019re feeling this", "What it costs"], [2000, 4440, 3640]),
              makeRow([
                [new TextRun({ text: "CTO / VP Eng", bold: true, font: "Calibri", size: 19, color: NAVY })],
                "Agents ship code that violates constraints nobody documented. You find out in production.",
                "Incidents, rework, eroded trust in AI tooling"
              ], [2000, 4440, 3640], { shading: LIGHT_BG }),
              makeRow([
                [new TextRun({ text: "CPO / VP Product", bold: true, font: "Calibri", size: 19, color: NAVY })],
                "Your roadmap says \u201Cdon\u2019t build X\u201D but an agent builds it anyway because the PRD isn\u2019t in the codebase.",
                "Scope creep, wasted sprints, diluted product focus"
              ], [2000, 4440, 3640]),
              makeRow([
                [new TextRun({ text: "Eng Manager", bold: true, font: "Calibri", size: 19, color: NAVY })],
                "Three squads make incompatible assumptions about the same system. You discover it during integration.",
                "Coordination tax, missed deadlines, team friction"
              ], [2000, 4440, 3640], { shading: LIGHT_BG }),
            ]
          }),
          bodyParagraph([
            new TextRun({ text: "None of these are solved by better tests, better prompts, or better agents.", bold: true, font: "Calibri", size: 20, color: NAVY }),
            new TextRun({ text: " They\u2019re solved by making the rules explicit, machine-readable, and enforced before code merges.", font: "Calibri", size: 20, color: "333333" }),
          ], { after: 40 }),

          // ═══════════════════════════════════════════════
          // SEMANTIC AUTHORITY: ONE FILE, THREE LEVELS
          // ═══════════════════════════════════════════════
          sectionHeading("Semantic Authority: One File, Three Enforcement Levels"),
          bodyParagraph([
            new TextRun({ text: "MEANING.yaml", bold: true, font: "Consolas", size: 21, color: ACCENT }),
            new TextRun({ text: " is a structured file that lives in your repo and declares:", font: "Calibri", size: 21, color: "333333" }),
          ]),
          ...[
            { bold: "What the system is for", rest: " \u2014 one sentence, testable success criteria" },
            { bold: "What it is NOT for", rest: " \u2014 explicit scope boundaries agents must respect" },
            { bold: "What must never be violated", rest: " \u2014 constraints with IDs, owners, and enforcement levels" },
            { bold: "What trade-offs were chosen", rest: " \u2014 and when to revisit them" },
          ].map(item => new Paragraph({
            numbering: { reference: "bullets", level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({ text: item.bold, bold: true, font: "Calibri", size: 20, color: NAVY }),
              new TextRun({ text: item.rest, font: "Calibri", size: 20, color: "333333" })
            ]
          })),

          // Enforcement levels table
          bodyParagraph([
            new TextRun({ text: "Three enforcement levels give you graduated control:", font: "Calibri", size: 20, color: "333333" }),
          ], { after: 60 }),
          new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: [1600, 3240, 5240],
            rows: [
              makeHeaderRow(["Level", "What happens", "Example"], [1600, 3240, 5240]),
              makeRow([
                [new TextRun({ text: "Block", bold: true, font: "Calibri", size: 19, color: RED })],
                "PR cannot merge",
                "\u201CInvoice must never be paid twice for the same vendor\u201D"
              ], [1600, 3240, 5240], { shading: LIGHT_BG }),
              makeRow([
                [new TextRun({ text: "Warn", bold: true, font: "Calibri", size: 19, color: AMBER })],
                "PR flagged, owner must acknowledge",
                "\u201CSearch P95 must stay under 500ms\u201D"
              ], [1600, 3240, 5240]),
              makeRow([
                [new TextRun({ text: "Observe", bold: true, font: "Calibri", size: 19, color: ACCENT })],
                "Logged for trend analysis",
                "\u201CPrefer async over sync for external calls\u201D"
              ], [1600, 3240, 5240], { shading: LIGHT_BG }),
            ]
          }),
          bodyParagraph([
            new TextRun({ text: "You start with observe. You promote to warn. You escalate to block.", bold: true, italics: true, font: "Calibri", size: 19, color: MID_GRAY }),
            new TextRun({ text: " Your team builds confidence before enforcement tightens.", italics: true, font: "Calibri", size: 19, color: MID_GRAY }),
          ], { after: 60 }),

          // ═══════════════════════════════════════════════
          // WHAT CHANGES FOR YOUR ORG
          // ═══════════════════════════════════════════════
          sectionHeading("What Changes for Your Org"),
          // Product leaders
          bodyParagraph([
            new TextRun({ text: "For product leaders: ", bold: true, font: "Calibri", size: 21, color: ACCENT }),
            new TextRun({ text: "Your non-goals finally have teeth. When you say \u201Cwe are not building multi-currency in v1,\u201D that boundary lives in the codebase \u2014 not in a Confluence page nobody reads. AI agents see it before they write a single line. Drift reports show you exactly where intent is diverging from implementation.", font: "Calibri", size: 21, color: "333333" }),
          ]),
          // Engineering leaders
          bodyParagraph([
            new TextRun({ text: "For engineering leaders: ", bold: true, font: "Calibri", size: 21, color: ACCENT }),
            new TextRun({ text: "Constraints get IDs, owners, and enforcement levels \u2014 like policies in production, but for meaning. CI catches violations the same way it catches test failures. Your agents cite constraint IDs in PRs. New hires read MEANING.yaml on day one and understand what matters before writing code.", font: "Calibri", size: 21, color: "333333" }),
          ]),
          // Eng managers
          bodyParagraph([
            new TextRun({ text: "For eng managers: ", bold: true, font: "Calibri", size: 21, color: ACCENT }),
            new TextRun({ text: "Cross-team coordination becomes explicit. When team A\u2019s constraint affects team B\u2019s service, that dependency is declared, not discovered during a 2am incident. Drift reports replace \u201CI thought you knew\u201D with \u201Chere\u2019s the constraint ID.\u201D", font: "Calibri", size: 21, color: "333333" }),
          ]),

          // ── PAGE BREAK ──
          new Paragraph({ children: [new PageBreak()] }),

          // ═══════════════════════════════════════════════
          // HOW TEAMS ADOPT IT
          // ═══════════════════════════════════════════════
          sectionHeading("How Teams Adopt It"),
          new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: [1600, 5080, 3400],
            rows: [
              makeHeaderRow(["Week", "What happens", "Disruption"], [1600, 5080, 3400]),
              makeRow([
                [new TextRun({ text: "Day 1", bold: true, font: "Calibri", size: 19, color: NAVY })],
                [
                  new TextRun({ text: "Run ", font: "Calibri", size: 19, color: "333333" }),
                  new TextRun({ text: "meaning init", bold: true, font: "Consolas", size: 19, color: ACCENT }),
                  new TextRun({ text: " \u2014 5-minute wizard scaffolds MEANING.yaml", font: "Calibri", size: 19, color: "333333" }),
                ],
                "Zero. It\u2019s a YAML file."
              ], [1600, 5080, 3400], { shading: LIGHT_BG }),
              makeRow([
                [new TextRun({ text: "Week 1", bold: true, font: "Calibri", size: 19, color: NAVY })],
                "Team reads it. PMs refine goals and non-goals.",
                "A useful conversation."
              ], [1600, 5080, 3400]),
              makeRow([
                [new TextRun({ text: "Week 2", bold: true, font: "Calibri", size: 19, color: NAVY })],
                [
                  new TextRun({ text: "Run ", font: "Calibri", size: 19, color: "333333" }),
                  new TextRun({ text: "meaning context", bold: true, font: "Consolas", size: 19, color: ACCENT }),
                  new TextRun({ text: " \u2014 AI agents get auto-generated guardrails", font: "Calibri", size: 19, color: "333333" }),
                ],
                "Agents get smarter, not slower."
              ], [1600, 5080, 3400], { shading: LIGHT_BG }),
              makeRow([
                [new TextRun({ text: "Week 3", bold: true, font: "Calibri", size: 19, color: NAVY })],
                "CI runs validation. Warnings in PRs. No blocking.",
                "Visibility without friction."
              ], [1600, 5080, 3400]),
              makeRow([
                [new TextRun({ text: "Week 5+", bold: true, font: "Calibri", size: 19, color: NAVY })],
                "Block-level constraints fail the build.",
                "Governance that actually works."
              ], [1600, 5080, 3400], { shading: LIGHT_BG }),
            ]
          }),
          bodyParagraph([
            new TextRun({ text: "Already have a BRD or PRD? ", bold: true, font: "Calibri", size: 20, color: NAVY }),
            new TextRun({ text: "Feed it to any LLM with the included prompt template. You get an 80% complete MEANING.yaml in minutes.", font: "Calibri", size: 20, color: "333333" }),
          ], { after: 80 }),

          // ═══════════════════════════════════════════════
          // WHAT A CONSTRAINT LOOKS LIKE
          // ═══════════════════════════════════════════════
          sectionHeading("What a Constraint Actually Looks Like"),
          new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: [CONTENT_W],
            rows: [new TableRow({
              children: [new TableCell({
                borders: { top: thinBorder, bottom: thinBorder, left: { style: BorderStyle.SINGLE, size: 8, color: ACCENT }, right: thinBorder },
                shading: { fill: "F8F9FE", type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 200, right: 200 },
                width: { size: CONTENT_W, type: WidthType.DXA },
                children: [
                  new Paragraph({ spacing: { after: 40 }, children: [
                    new TextRun({ text: "id: ", font: "Consolas", size: 19, color: MID_GRAY }),
                    new TextRun({ text: "C-FIN-NO-DOUBLE-PAY-001", font: "Consolas", size: 19, bold: true, color: NAVY }),
                  ]}),
                  new Paragraph({ spacing: { after: 40 }, children: [
                    new TextRun({ text: "description: ", font: "Consolas", size: 19, color: MID_GRAY }),
                    new TextRun({ text: "\u201CInvoice must never be paid twice for the same vendor\u201D", font: "Consolas", size: 19, color: "333333" }),
                  ]}),
                  new Paragraph({ spacing: { after: 40 }, children: [
                    new TextRun({ text: "enforcement: ", font: "Consolas", size: 19, color: MID_GRAY }),
                    new TextRun({ text: "block", font: "Consolas", size: 19, bold: true, color: RED }),
                  ]}),
                  new Paragraph({ spacing: { after: 40 }, children: [
                    new TextRun({ text: "owner: ", font: "Consolas", size: 19, color: MID_GRAY }),
                    new TextRun({ text: "finance-engineering", font: "Consolas", size: 19, color: "333333" }),
                  ]}),
                  new Paragraph({ spacing: { after: 40 }, children: [
                    new TextRun({ text: "rationale: ", font: "Consolas", size: 19, color: MID_GRAY }),
                    new TextRun({ text: "\u201CDuplicate payments cause direct financial loss\u201D", font: "Consolas", size: 19, color: "333333" }),
                  ]}),
                  new Paragraph({ children: [
                    new TextRun({ text: "confidence: ", font: "Consolas", size: 19, color: MID_GRAY }),
                    new TextRun({ text: "high", font: "Consolas", size: 19, color: GREEN }),
                  ]}),
                ]
              })]
            })]
          }),
          bodyParagraph([
            new TextRun({ text: "Not a guideline. Not a \u201Cbest practice.\u201D A machine-enforceable boundary with an owner, a rationale, and a CI gate.", italics: true, font: "Calibri", size: 19, color: MID_GRAY })
          ], { after: 200 }),

          // ═══════════════════════════════════════════════
          // WHY THIS MATTERS NOW
          // ═══════════════════════════════════════════════
          sectionHeading("Why This Matters Now"),
          bodyParagraph([
            new TextRun({ text: "Every org is adopting AI agents. The ones that move fastest will be the ones that can ", font: "Calibri", size: 21, color: "333333" }),
            new TextRun({ text: "trust their agents to stay inside the lines", bold: true, font: "Calibri", size: 21, color: NAVY }),
            new TextRun({ text: " \u2014 without slowing them down with manual review of every PR.", font: "Calibri", size: 21, color: "333333" }),
          ]),
          bodyParagraph([
            new TextRun({ text: "The orgs that figure out AI governance early will ship faster, break less, and retain the trust of their customers and their teams. The ones that don\u2019t will spend the next two years cleaning up drift they can\u2019t see yet.", font: "Calibri", size: 21, color: "333333" }),
          ]),

          // Closing block
          new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: [CONTENT_W],
            rows: [new TableRow({
              children: [new TableCell({
                borders: noBorders,
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                margins: { top: 160, bottom: 160, left: 300, right: 300 },
                width: { size: CONTENT_W, type: WidthType.DXA },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [
                    new TextRun({ text: "Semantic Authority is how you make the lines visible, machine-readable, and enforceable.", font: "Georgia", size: 22, bold: true, italics: true, color: "64DFDF" })
                  ]}),
                ]
              })]
            })]
          }),
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const outDir = path.join(__dirname, "out");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "Semantic_Authority_Executive_Brief.docx"), buffer);
  console.log("Executive brief saved with persuasive framing!");
}

build().catch(err => { console.error(err); process.exit(1); });
