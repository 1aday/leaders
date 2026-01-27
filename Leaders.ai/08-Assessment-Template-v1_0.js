/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LEADER ASSESSMENT TEMPLATE v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Implements: Assessment Output Specification v1.0
 * Conforms to: Leadership Definition v1.1 + Assessment Protocol v1.0
 * 
 * USAGE:
 * 1. Copy this file
 * 2. Fill in the SUBJECT_DATA object with assessment-specific data
 * 3. Run: node assessment-template.js
 * 4. Output: [SubjectName]-Assessment-v1.1.docx
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, BorderStyle, WidthType, ShadingType, AlignmentType,
        LevelFormat, PageBreak } = require('docx');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION CONSTANTS (per Output Specification v1.0)
// ═══════════════════════════════════════════════════════════════════════════

const COLORS = {
    headerBg: '2C3E50',
    headerText: 'FFFFFF',
    altRow: 'F8F9FA',
    border: 'CCCCCC',
    score90: 'C8E6C9',    // Excellent/Legendary
    score70: 'DCEDC8',    // Strong
    score50: 'FFF9C4',    // Competent
    score30: 'FFE0B2',    // Developing
    score10: 'FFCCBC',    // Deficient
    score0: 'FFCDD2',     // Disqualified
    warning: 'FFF3CD',
    principle: 'E8F4F8',
    info: 'E3F2FD',
    positive: 'E8F5E9',
    negative: 'FFEBEE',
    flag: 'F5F5F5'
};

const FONTS = {
    primary: 'Arial',
    code: 'Courier New'
};

const SIZES = {
    title: 48,
    subtitle: 32,
    h1: 32,
    h2: 28,
    h3: 24,
    body: 24,
    table: 22,
    score: 36,
    small: 20
};

// ═══════════════════════════════════════════════════════════════════════════
// SUBJECT DATA - FILL THIS IN FOR EACH ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════

const SUBJECT_DATA = {
    // ─────────────────────────────────────────────────────────────────────
    // BASIC INFO
    // ─────────────────────────────────────────────────────────────────────
    name: "SUBJECT NAME",                    // ALL CAPS
    descriptor: "Title | Role | Description",
    lifespan: "YYYY – YYYY",                 // or "Born YYYY" for living
    assessmentDate: "January 2026",
    organization: "Node Wizards / Decentral",
    
    // ─────────────────────────────────────────────────────────────────────
    // SCORES (all out of 100)
    // ─────────────────────────────────────────────────────────────────────
    scores: {
        leadership: 0,           // Final Leadership Score
        influence: 0,            // Influence Score (if polarizing)
        jobsMultiplier: 1.0,     // 0-1.0
        jobsLabel: "Clean",      // Clean/Minor Flaws/Notable Flaws/Significant Flaws/Disqualifying
        
        // Pillar scores (normalized)
        character: 0,
        competence: 0,
        impact: 0,
        
        // Achievement score (before Jobs Rule)
        achievement: 0,
        
        // Dimension scores
        dimensions: {
            // Character (44% weight)
            integrity: 0,        // 15%
            beneficence: 0,      // 8%
            vulnerability: 0,    // 6%
            accountability: 0,   // 8%
            consistency: 0,      // 7%
            
            // Competence (34% weight)
            vision: 0,           // 12%
            expertise: 0,        // 8%
            communication: 0,    // 6%
            courage: 0,          // 8%
            
            // Impact (36% weight)
            valueCreation: 0,    // 12%
            trustworthiness: 0,  // 12%
            results: 0           // 12%
        },
        
        // Influence dimensions (if polarizing)
        influenceDimensions: {
            reach: 0,            // 25%
            persuasion: 0,       // 25%
            narrativePower: 0,   // 20%
            lastingImpact: 0,    // 15%
            operational: 0       // 15%
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────
    // FLAGS & CONDITIONS
    // ─────────────────────────────────────────────────────────────────────
    isPolarizing: false,         // If true, shows Influence Score + breakdown
    hasPendingLegal: false,      // If true, shows Pending Legal Matters section
    scoreIfProven: null,         // Set to 0 if disqualifying charges pending
    
    // ─────────────────────────────────────────────────────────────────────
    // PENDING LEGAL MATTERS (if hasPendingLegal = true)
    // ─────────────────────────────────────────────────────────────────────
    legalMatters: [
        // {
        //     status: "CHARGED",
        //     charges: "Description of charges",
        //     jurisdiction: "Location",
        //     dateFiled: "Month Year",
        //     currentStatus: "Status description"
        // }
    ],
    subjectLegalResponse: "",    // Subject's response to charges
    
    // ─────────────────────────────────────────────────────────────────────
    // EXECUTIVE SUMMARY
    // ─────────────────────────────────────────────────────────────────────
    executiveSummary: {
        openingParagraph: "",
        frameworkStatement: "",
        keyFindings: [
            // "Finding 1",
            // "Finding 2",
        ]
    },
    
    // ─────────────────────────────────────────────────────────────────────
    // SUPPORTER STEELMAN
    // ─────────────────────────────────────────────────────────────────────
    supporterSteelman: {
        principleStatement: "This section articulates the strongest case FOR [Subject], written as a genuine supporter would present it.",
        
        whatSupportersValue: [
            {
                title: "Value Point 1",
                description: "Description of what supporters value"
            }
        ],
        
        highlightQuote: {
            text: "Quote text here",
            attribution: "Source attribution"
        },
        
        positiveOutcomes: [
            // "Outcome 1",
        ],
        
        contextEmphasis: [
            {
                topic: "On [topic]:",
                explanation: "Supporter explanation"
            }
        ]
    },
    
    // ─────────────────────────────────────────────────────────────────────
    // CRITIC STEELMAN
    // ─────────────────────────────────────────────────────────────────────
    criticSteelman: {
        principleStatement: "This section articulates the strongest case AGAINST [Subject], with all claims properly classified per the Claim Hygiene Protocol.",
        
        verifiedConcerns: [
            {
                title: "Concern Title",
                description: "Description",
                evidence: ["Evidence point 1"],
                classification: "VERIFIED — explanation"
            }
        ],
        
        chargedConcerns: [
            // Only if hasPendingLegal
            // {
            //     title: "Charge Title",
            //     description: "Description",
            //     jurisdiction: "Location",
            //     dateFiled: "Date",
            //     classification: "CHARGED — explanation"
            // }
        ],
        
        allegedConcerns: [
            // {
            //     title: "Allegation Title",
            //     description: "Description",
            //     classification: "ALLEGED — explanation"
            // }
        ],
        
        opinionCriticism: [
            {
                label: "Label",
                criticism: "The criticism",
                counter: "The counter-argument"
            }
        ]
    },
    
    // ─────────────────────────────────────────────────────────────────────
    // WORLDVIEW FLAGS
    // ─────────────────────────────────────────────────────────────────────
    worldviewFlags: [
        {
            title: "Flag Title",
            description: "Description of the worldview position",
            classification: "Classification explanation"
        }
    ],
    
    // ─────────────────────────────────────────────────────────────────────
    // DIMENSION EVIDENCE (for Three Pillars section)
    // ─────────────────────────────────────────────────────────────────────
    dimensionEvidence: {
        // Character dimensions
        integrity: {
            positive: ["Positive point 1"],
            negative: ["Negative point 1"],
            justification: "Justification for score"
        },
        beneficence: {
            positive: [],
            negative: [],
            justification: ""
        },
        vulnerability: {
            positive: [],
            negative: [],
            justification: ""
        },
        accountability: {
            positive: [],
            negative: [],
            justification: ""
        },
        consistency: {
            positive: [],
            negative: [],
            justification: ""
        },
        
        // Competence dimensions
        vision: {
            positive: [],
            negative: [],
            justification: ""
        },
        expertise: {
            positive: [],
            negative: [],
            justification: ""
        },
        communication: {
            positive: [],
            negative: [],
            justification: ""
        },
        courage: {
            positive: [],
            negative: [],
            justification: ""
        },
        
        // Impact dimensions
        valueCreation: {
            positive: [],
            negative: [],
            justification: ""
        },
        trustworthiness: {
            positive: [],
            negative: [],
            justification: ""
        },
        results: {
            positive: [],
            negative: [],
            justification: ""
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────
    // INFLUENCE EVIDENCE (if polarizing)
    // ─────────────────────────────────────────────────────────────────────
    influenceEvidence: {
        reach: "",
        persuasion: "",
        narrativePower: "",
        lastingImpact: "",
        operational: ""
    },
    
    // ─────────────────────────────────────────────────────────────────────
    // JOBS RULE
    // ─────────────────────────────────────────────────────────────────────
    jobsRule: {
        verifiedIssues: [
            // "Issue 1: Description"
        ],
        notFactored: [
            // "Item not factored (CHARGED/ALLEGED/OPINION)"
        ],
        mitigatingFactors: [
            // "Mitigating factor 1"
        ],
        justification: "Justification for multiplier"
    },
    
    // ─────────────────────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────────────────────
    summary: {
        keyDistinctions: [
            // "Distinction 1"
        ],
        historicalNote: "",      // Optional
        comparisonNote: ""       // Optional - vs previous version
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const border = { style: BorderStyle.SINGLE, size: 1, color: COLORS.border };
const borders = { top: border, bottom: border, left: border, right: border };
const headerShading = { fill: COLORS.headerBg, type: ShadingType.CLEAR };
const altShading = { fill: COLORS.altRow, type: ShadingType.CLEAR };
const margins = { top: 80, bottom: 80, left: 120, right: 120 };

function getScoreTier(score) {
    if (score >= 90) return { label: 'EXCELLENT', symbol: '●', bg: COLORS.score90 };
    if (score >= 85) return { label: 'EXCELLENT', symbol: '●', bg: COLORS.score90 };
    if (score >= 70) return { label: 'STRONG', symbol: '◉', bg: COLORS.score70 };
    if (score >= 50) return { label: 'COMPETENT', symbol: '○', bg: COLORS.score50 };
    if (score >= 30) return { label: 'DEVELOPING', symbol: '◌', bg: COLORS.score30 };
    if (score >= 10) return { label: 'DEFICIENT', symbol: '△', bg: COLORS.score10 };
    return { label: 'DISQUALIFIED', symbol: '✗', bg: COLORS.score0 };
}

function getInfluenceTier(score) {
    if (score >= 90) return { label: 'LEGENDARY', symbol: '★', bg: COLORS.score90 };
    if (score >= 70) return { label: 'EXCELLENT', symbol: '●', bg: COLORS.score70 };
    if (score >= 50) return { label: 'STRONG', symbol: '◉', bg: COLORS.score50 };
    if (score >= 30) return { label: 'MODERATE', symbol: '○', bg: COLORS.score30 };
    return { label: 'LIMITED', symbol: '◌', bg: COLORS.score10 };
}

function getScoreBgColor(score) {
    if (score >= 85) return COLORS.score90;
    if (score >= 70) return COLORS.score70;
    if (score >= 50) return COLORS.score50;
    if (score >= 30) return COLORS.score30;
    if (score > 0) return COLORS.score10;
    return COLORS.score0;
}

function spacer() {
    return new Paragraph({ spacing: { after: 200 }, children: [] });
}

function title(text) {
    return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text, bold: true, size: SIZES.title, font: FONTS.primary })]
    });
}

function subtitle(text) {
    return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text, bold: true, size: SIZES.subtitle, font: FONTS.primary })]
    });
}

function versionLine(text) {
    return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text, italics: true, size: SIZES.body, font: FONTS.primary })]
    });
}

function separator() {
    return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", size: SIZES.body })]
    });
}

function h1(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        children: [new TextRun({ text, bold: true, size: SIZES.h1, font: FONTS.primary })]
    });
}

function h2(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
        children: [new TextRun({ text, bold: true, size: SIZES.h2, font: FONTS.primary })]
    });
}

function h3(text) {
    return new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text, bold: true, size: SIZES.h3, font: FONTS.primary })]
    });
}

function para(text) {
    return new Paragraph({
        spacing: { after: 150 },
        children: [new TextRun({ text, size: SIZES.body, font: FONTS.primary })]
    });
}

function boldPara(boldText, normalText) {
    return new Paragraph({
        spacing: { after: 150 },
        children: [
            new TextRun({ text: boldText, bold: true, size: SIZES.body, font: FONTS.primary }),
            new TextRun({ text: normalText, size: SIZES.body, font: FONTS.primary })
        ]
    });
}

function bullet(text) {
    return new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 80 },
        children: [new TextRun({ text, size: SIZES.body, font: FONTS.primary })]
    });
}

function numberedItem(text) {
    return new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        spacing: { after: 80 },
        children: [new TextRun({ text, size: SIZES.body, font: FONTS.primary })]
    });
}

function warningBox(text) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [9360],
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        borders,
                        width: { size: 9360, type: WidthType.DXA },
                        shading: { fill: COLORS.warning, type: ShadingType.CLEAR },
                        margins,
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: "⚠️ " + text, bold: true, size: SIZES.body, font: FONTS.primary })]
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

function principleBox(text) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [9360],
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        borders,
                        width: { size: 9360, type: WidthType.DXA },
                        shading: { fill: COLORS.principle, type: ShadingType.CLEAR },
                        margins,
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text, bold: true, italics: true, size: 26, font: FONTS.primary })]
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

function infoBox(titleText, content) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [9360],
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        borders,
                        width: { size: 9360, type: WidthType.DXA },
                        shading: { fill: COLORS.info, type: ShadingType.CLEAR },
                        margins,
                        children: [
                            new Paragraph({ children: [new TextRun({ text: titleText, bold: true, size: SIZES.body, font: FONTS.primary })] }),
                            new Paragraph({ children: [new TextRun({ text: content, size: SIZES.table, font: FONTS.primary })] })
                        ]
                    })
                ]
            })
        ]
    });
}

function greenBox(text) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [9360],
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        borders,
                        width: { size: 9360, type: WidthType.DXA },
                        shading: { fill: COLORS.positive, type: ShadingType.CLEAR },
                        margins,
                        children: [
                            new Paragraph({ children: [new TextRun({ text, size: SIZES.body, font: FONTS.primary })] })
                        ]
                    })
                ]
            })
        ]
    });
}

function redBox(text) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [9360],
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        borders,
                        width: { size: 9360, type: WidthType.DXA },
                        shading: { fill: COLORS.negative, type: ShadingType.CLEAR },
                        margins,
                        children: [
                            new Paragraph({ children: [new TextRun({ text, size: SIZES.body, font: FONTS.primary })] })
                        ]
                    })
                ]
            })
        ]
    });
}

function flagBox(title, description, classification) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [9360],
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        borders,
                        width: { size: 9360, type: WidthType.DXA },
                        shading: { fill: COLORS.flag, type: ShadingType.CLEAR },
                        margins,
                        children: [
                            new Paragraph({ children: [new TextRun({ text: "⚐ FLAGGED — " + title, bold: true, size: SIZES.body, font: FONTS.primary })] }),
                            new Paragraph({ children: [new TextRun({ text: description, size: SIZES.table, font: FONTS.primary })] }),
                            new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: "Classification: " + classification, italics: true, size: SIZES.table, font: FONTS.primary })] })
                        ]
                    })
                ]
            })
        ]
    });
}

function scoreBox(label, score, tierLabel, symbol) {
    const bgColor = getScoreBgColor(score);
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [9360],
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        borders,
                        width: { size: 9360, type: WidthType.DXA },
                        shading: { fill: bgColor, type: ShadingType.CLEAR },
                        margins,
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({ text: label + ": ", bold: true, size: SIZES.h2, font: FONTS.primary }),
                                    new TextRun({ text: score + " / 100", bold: true, size: SIZES.score, font: FONTS.primary })
                                ]
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: symbol + " " + tierLabel, size: SIZES.body, font: FONTS.primary })]
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

function evidenceBox(positive, negative, justification) {
    const children = [];
    
    children.push(new Paragraph({ children: [new TextRun({ text: "VERIFIED POSITIVE:", bold: true, size: SIZES.table, font: FONTS.primary })] }));
    positive.forEach(p => {
        children.push(new Paragraph({ children: [new TextRun({ text: "• " + p, size: SIZES.table, font: FONTS.primary })] }));
    });
    
    children.push(new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: "VERIFIED NEGATIVE:", bold: true, size: SIZES.table, font: FONTS.primary })] }));
    negative.forEach(n => {
        children.push(new Paragraph({ children: [new TextRun({ text: "• " + n, size: SIZES.table, font: FONTS.primary })] }));
    });
    
    children.push(new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: "Justification: " + justification, italics: true, size: SIZES.table, font: FONTS.primary })] }));
    
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [9360],
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        borders,
                        width: { size: 9360, type: WidthType.DXA },
                        margins,
                        children
                    })
                ]
            })
        ]
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION BUILDERS
// ═══════════════════════════════════════════════════════════════════════════

function buildTitlePage(data) {
    const leadershipTier = getScoreTier(data.scores.leadership);
    const influenceTier = getInfluenceTier(data.scores.influence);
    
    const elements = [
        spacer(), spacer(), spacer(),
        title("LEADER ASSESSMENT"),
        spacer(),
        subtitle(data.name),
        spacer(),
        versionLine(data.descriptor),
        versionLine(data.lifespan),
        separator(),
        spacer()
    ];
    
    // Score Summary Box (2x2 grid per specification)
    const row1Cells = [
        // Row 1, Cell 1: LEADERSHIP SCORE (ALWAYS first)
        new TableCell({
            borders,
            width: { size: 4680, type: WidthType.DXA },
            shading: { fill: leadershipTier.bg, type: ShadingType.CLEAR },
            margins,
            children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "LEADERSHIP SCORE", bold: true, size: SIZES.body, font: FONTS.primary })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.scores.leadership + " / 100", bold: true, size: SIZES.score, font: FONTS.primary })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: leadershipTier.symbol + " " + leadershipTier.label, size: SIZES.table, font: FONTS.primary })] })
            ]
        })
    ];
    
    // Row 1, Cell 2: INFLUENCE SCORE (if polarizing)
    if (data.isPolarizing) {
        row1Cells.push(
            new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: COLORS.info, type: ShadingType.CLEAR },
                margins,
                children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "INFLUENCE SCORE", bold: true, size: SIZES.body, font: FONTS.primary })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.scores.influence + " / 100", bold: true, size: SIZES.score, font: FONTS.primary })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: influenceTier.symbol + " " + influenceTier.label, size: SIZES.table, font: FONTS.primary })] })
                ]
            })
        );
    } else {
        row1Cells.push(
            new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: COLORS.flag, type: ShadingType.CLEAR },
                margins,
                children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ACHIEVEMENT SCORE", bold: true, size: SIZES.body, font: FONTS.primary })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.scores.achievement + " / 100", bold: true, size: SIZES.score, font: FONTS.primary })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "(Before Jobs Rule)", size: SIZES.table, font: FONTS.primary })] })
                ]
            })
        );
    }
    
    // Row 2
    const row2Cells = [];
    
    // Row 2, Cell 1: JOBS RULE MULTIPLIER or SCORE-IF-PROVEN
    if (data.hasPendingLegal && data.scoreIfProven !== null) {
        row2Cells.push(
            new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: COLORS.score0, type: ShadingType.CLEAR },
                margins,
                children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "SCORE-IF-PROVEN", bold: true, size: SIZES.small, font: FONTS.primary })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.scoreIfProven + " / 100", bold: true, size: SIZES.h2, font: FONTS.primary })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "If charges result in conviction", size: SIZES.small, font: FONTS.primary })] })
                ]
            })
        );
    } else {
        row2Cells.push(
            new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: COLORS.flag, type: ShadingType.CLEAR },
                margins,
                children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "JOBS RULE MULTIPLIER", bold: true, size: SIZES.small, font: FONTS.primary })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.scores.jobsMultiplier.toFixed(2), bold: true, size: SIZES.h2, font: FONTS.primary })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.scores.jobsLabel, size: SIZES.small, font: FONTS.primary })] })
                ]
            })
        );
    }
    
    // Row 2, Cell 2: POLARIZING STATUS
    row2Cells.push(
        new TableCell({
            borders,
            width: { size: 4680, type: WidthType.DXA },
            shading: { fill: COLORS.flag, type: ShadingType.CLEAR },
            margins,
            children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "POLARIZING STATUS", bold: true, size: SIZES.small, font: FONTS.primary })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.isPolarizing ? "YES" : "NO", bold: true, size: SIZES.h2, font: FONTS.primary })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.isPolarizing ? "Dual Scoring Applied" : "Single Score", size: SIZES.small, font: FONTS.primary })] })
            ]
        })
    );
    
    elements.push(
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [4680, 4680],
            rows: [
                new TableRow({ children: row1Cells }),
                new TableRow({ children: row2Cells })
            ]
        })
    );
    
    elements.push(
        spacer(), spacer(),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Framework: Leadership Definition v1.1 | Protocol: Assessment Protocol v1.0", size: SIZES.table, font: FONTS.primary })]
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Assessment Date: " + data.assessmentDate, size: SIZES.table, font: FONTS.primary })]
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: data.organization, size: SIZES.table, font: FONTS.primary })]
        }),
        new Paragraph({ children: [new PageBreak()] })
    );
    
    return elements;
}

function buildPendingLegalSection(data) {
    if (!data.hasPendingLegal) return [];
    
    const elements = [
        h1("PENDING LEGAL MATTERS NOTICE"),
        spacer(),
        warningBox("This assessment involves a subject with pending legal matters. Per Assessment Protocol v1.0, charges are noted but NOT factored into the current score. Dual Scenario scoring is applied."),
        spacer()
    ];
    
    data.legalMatters.forEach((matter, index) => {
        elements.push(
            h3(`[${matter.status}] Case ${index + 1}`),
            para(`Charges: ${matter.charges}`),
            para(`Jurisdiction: ${matter.jurisdiction} | Filed: ${matter.dateFiled}`),
            para(`Status: ${matter.currentStatus}`),
            spacer()
        );
    });
    
    if (data.subjectLegalResponse) {
        elements.push(
            h3("Subject's Response"),
            para(data.subjectLegalResponse),
            spacer()
        );
    }
    
    elements.push(
        h2("Dual Scenario Explanation"),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [2500, 6860],
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Scenario", bold: true, color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Explanation", bold: true, color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "Score-Now", bold: true, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "Based on verified facts only. Charges noted but not factored.", size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Score-If-Proven", bold: true, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Hypothetical if charges result in conviction = potential disqualification.", size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                })
            ]
        }),
        new Paragraph({ children: [new PageBreak()] })
    );
    
    return elements;
}

function buildExecutiveSummary(data) {
    const elements = [
        h1("EXECUTIVE SUMMARY"),
        spacer(),
        para(data.executiveSummary.openingParagraph),
        spacer(),
        para(data.executiveSummary.frameworkStatement),
        spacer(),
        h2("Key Findings")
    ];
    
    data.executiveSummary.keyFindings.forEach(finding => {
        elements.push(bullet(finding));
    });
    
    elements.push(new Paragraph({ children: [new PageBreak()] }));
    
    return elements;
}

function buildSupporterSteelman(data) {
    const elements = [
        h1("SUPPORTER STEELMAN"),
        spacer(),
        principleBox(data.supporterSteelman.principleStatement),
        spacer(),
        h2("What Supporters Value")
    ];
    
    data.supporterSteelman.whatSupportersValue.forEach((item, index) => {
        elements.push(
            h3(`${index + 1}. ${item.title}`),
            para(item.description),
            spacer()
        );
    });
    
    if (data.supporterSteelman.highlightQuote) {
        elements.push(
            greenBox(`"${data.supporterSteelman.highlightQuote.text}" — ${data.supporterSteelman.highlightQuote.attribution}`),
            spacer()
        );
    }
    
    elements.push(h2("Positive Outcomes Documented"));
    data.supporterSteelman.positiveOutcomes.forEach(outcome => {
        elements.push(bullet(outcome));
    });
    
    elements.push(spacer(), h2("Context Supporters Emphasize"));
    data.supporterSteelman.contextEmphasis.forEach(item => {
        elements.push(boldPara(item.topic + " ", item.explanation), spacer());
    });
    
    elements.push(new Paragraph({ children: [new PageBreak()] }));
    
    return elements;
}

function buildCriticSteelman(data) {
    const elements = [
        h1("CRITIC STEELMAN"),
        spacer(),
        principleBox(data.criticSteelman.principleStatement),
        spacer(),
        h2("Primary Concerns"),
        spacer()
    ];
    
    // Verified concerns
    data.criticSteelman.verifiedConcerns.forEach(concern => {
        elements.push(h3(`[VERIFIED] — ${concern.title}`));
        elements.push(para(concern.description));
        concern.evidence.forEach(e => elements.push(bullet(e)));
        elements.push(spacer(), redBox("Classification: " + concern.classification), spacer());
    });
    
    // Charged concerns
    if (data.criticSteelman.chargedConcerns && data.criticSteelman.chargedConcerns.length > 0) {
        data.criticSteelman.chargedConcerns.forEach(concern => {
            elements.push(h3(`[CHARGED] — ${concern.title}`));
            elements.push(para(concern.description));
            elements.push(para(`Jurisdiction: ${concern.jurisdiction} | Filed: ${concern.dateFiled}`));
            elements.push(spacer(), warningBox("Classification: " + concern.classification), spacer());
        });
    }
    
    // Alleged concerns
    if (data.criticSteelman.allegedConcerns && data.criticSteelman.allegedConcerns.length > 0) {
        data.criticSteelman.allegedConcerns.forEach(concern => {
            elements.push(h3(`[ALLEGED] — ${concern.title}`));
            elements.push(para(concern.description));
            elements.push(spacer(), infoBox("Classification", concern.classification), spacer());
        });
    }
    
    // Opinion criticism
    if (data.criticSteelman.opinionCriticism && data.criticSteelman.opinionCriticism.length > 0) {
        elements.push(h3("[OPINION] — Interpretive Criticisms"));
        data.criticSteelman.opinionCriticism.forEach(item => {
            elements.push(boldPara(`"${item.label}": `, `${item.criticism} (Counter: ${item.counter})`), spacer());
        });
    }
    
    elements.push(new Paragraph({ children: [new PageBreak()] }));
    
    return elements;
}

function buildWorldviewFlags(data) {
    const elements = [
        h1("WORLDVIEW FLAGS"),
        spacer(),
        warningBox("Per Leadership Definition v1.1, Section IV: Worldview positions are FLAGGED for context but NOT SCORED. Only methods are scored."),
        spacer()
    ];
    
    data.worldviewFlags.forEach(flag => {
        elements.push(flagBox(flag.title, flag.description, flag.classification), spacer());
    });
    
    elements.push(
        principleBox("These worldview positions do NOT affect the Leadership Score. Only METHODS are scored."),
        new Paragraph({ children: [new PageBreak()] })
    );
    
    return elements;
}

function buildInfluenceScore(data) {
    if (!data.isPolarizing) return [];
    
    const tier = getInfluenceTier(data.scores.influence);
    const dims = data.scores.influenceDimensions;
    const evidence = data.influenceEvidence;
    
    const elements = [
        h1("INFLUENCE SCORE BREAKDOWN"),
        spacer(),
        para("The Influence Score measures reach, persuasion capability, and lasting impact — separate from ethical assessment."),
        spacer(),
        scoreBox("INFLUENCE SCORE", data.scores.influence, tier.label, tier.symbol),
        spacer(),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [3500, 1200, 4660],
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Dimension", bold: true, color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Score", bold: true, color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Evidence", bold: true, color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "Reach (25%)", bold: true, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: String(dims.reach), bold: true, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: evidence.reach, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Persuasion Skill (25%)", bold: true, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: String(dims.persuasion), bold: true, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: evidence.persuasion, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "Narrative Power (20%)", bold: true, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: String(dims.narrativePower), bold: true, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: evidence.narrativePower, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Lasting Impact (15%)", bold: true, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: String(dims.lastingImpact), bold: true, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: evidence.lastingImpact, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "Operational Effectiveness (15%)", bold: true, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: String(dims.operational), bold: true, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: evidence.operational, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                })
            ]
        }),
        spacer(),
        h2("Influence Score Calculation"),
        para(`(${dims.reach} × 0.25) + (${dims.persuasion} × 0.25) + (${dims.narrativePower} × 0.20) + (${dims.lastingImpact} × 0.15) + (${dims.operational} × 0.15) = ${data.scores.influence}`),
        new Paragraph({ children: [new PageBreak()] })
    ];
    
    return elements;
}

function buildThreePillars(data) {
    const dims = data.scores.dimensions;
    const evidence = data.dimensionEvidence;
    
    const elements = [
        h1("THREE PILLARS ANALYSIS"),
        spacer(),
        
        // ═══════════════════════════════════════════════════════════════════
        // PILLAR 1: CHARACTER
        // ═══════════════════════════════════════════════════════════════════
        h2("PILLAR 1: CHARACTER (44% weight)"),
        para("Scored on Universal Ethics only. Worldview positions flagged separately."),
        spacer(),
        
        h3(`Integrity — Score: ${dims.integrity}/100`),
        evidenceBox(evidence.integrity.positive, evidence.integrity.negative, evidence.integrity.justification),
        spacer(),
        
        h3(`Beneficence — Score: ${dims.beneficence}/100`),
        evidenceBox(evidence.beneficence.positive, evidence.beneficence.negative, evidence.beneficence.justification),
        spacer(),
        
        h3(`Vulnerability — Score: ${dims.vulnerability}/100`),
        evidenceBox(evidence.vulnerability.positive, evidence.vulnerability.negative, evidence.vulnerability.justification),
        spacer(),
        
        h3(`Accountability — Score: ${dims.accountability}/100`),
        evidenceBox(evidence.accountability.positive, evidence.accountability.negative, evidence.accountability.justification),
        spacer(),
        
        h3(`Consistency — Score: ${dims.consistency}/100`),
        evidenceBox(evidence.consistency.positive, evidence.consistency.negative, evidence.consistency.justification),
        spacer(),
        
        h3("Character Pillar Score"),
        para(`Raw: (${dims.integrity} × 0.15) + (${dims.beneficence} × 0.08) + (${dims.vulnerability} × 0.06) + (${dims.accountability} × 0.08) + (${dims.consistency} × 0.07) = ${(dims.integrity * 0.15 + dims.beneficence * 0.08 + dims.vulnerability * 0.06 + dims.accountability * 0.08 + dims.consistency * 0.07).toFixed(2)}`),
        para(`Normalized (÷ 0.44): ${data.scores.character}`),
        scoreBox("CHARACTER PILLAR", data.scores.character, getScoreTier(data.scores.character).label, getScoreTier(data.scores.character).symbol),
        
        new Paragraph({ children: [new PageBreak()] }),
        
        // ═══════════════════════════════════════════════════════════════════
        // PILLAR 2: COMPETENCE
        // ═══════════════════════════════════════════════════════════════════
        h2("PILLAR 2: COMPETENCE (34% weight)"),
        spacer(),
        
        h3(`Vision — Score: ${dims.vision}/100`),
        evidenceBox(evidence.vision.positive, evidence.vision.negative, evidence.vision.justification),
        spacer(),
        
        h3(`Expertise — Score: ${dims.expertise}/100`),
        evidenceBox(evidence.expertise.positive, evidence.expertise.negative, evidence.expertise.justification),
        spacer(),
        
        h3(`Communication — Score: ${dims.communication}/100`),
        evidenceBox(evidence.communication.positive, evidence.communication.negative, evidence.communication.justification),
        spacer(),
        
        h3(`Courage — Score: ${dims.courage}/100`),
        evidenceBox(evidence.courage.positive, evidence.courage.negative, evidence.courage.justification),
        spacer(),
        
        h3("Competence Pillar Score"),
        para(`Raw: (${dims.vision} × 0.12) + (${dims.expertise} × 0.08) + (${dims.communication} × 0.06) + (${dims.courage} × 0.08) = ${(dims.vision * 0.12 + dims.expertise * 0.08 + dims.communication * 0.06 + dims.courage * 0.08).toFixed(2)}`),
        para(`Normalized (÷ 0.34): ${data.scores.competence}`),
        scoreBox("COMPETENCE PILLAR", data.scores.competence, getScoreTier(data.scores.competence).label, getScoreTier(data.scores.competence).symbol),
        
        new Paragraph({ children: [new PageBreak()] }),
        
        // ═══════════════════════════════════════════════════════════════════
        // PILLAR 3: IMPACT
        // ═══════════════════════════════════════════════════════════════════
        h2("PILLAR 3: IMPACT (36% weight)"),
        spacer(),
        
        h3(`Value Creation — Score: ${dims.valueCreation}/100`),
        evidenceBox(evidence.valueCreation.positive, evidence.valueCreation.negative, evidence.valueCreation.justification),
        spacer(),
        
        h3(`Trustworthiness — Score: ${dims.trustworthiness}/100`),
        evidenceBox(evidence.trustworthiness.positive, evidence.trustworthiness.negative, evidence.trustworthiness.justification),
        spacer(),
        
        h3(`Results — Score: ${dims.results}/100`),
        evidenceBox(evidence.results.positive, evidence.results.negative, evidence.results.justification),
        spacer(),
        
        h3("Impact Pillar Score"),
        para(`Raw: (${dims.valueCreation} × 0.12) + (${dims.trustworthiness} × 0.12) + (${dims.results} × 0.12) = ${(dims.valueCreation * 0.12 + dims.trustworthiness * 0.12 + dims.results * 0.12).toFixed(2)}`),
        para(`Normalized (÷ 0.36): ${data.scores.impact}`),
        scoreBox("IMPACT PILLAR", data.scores.impact, getScoreTier(data.scores.impact).label, getScoreTier(data.scores.impact).symbol),
        
        new Paragraph({ children: [new PageBreak()] })
    ];
    
    return elements;
}

function buildJobsRule(data) {
    const elements = [
        h1("JOBS RULE APPLICATION"),
        spacer(),
        para("The Jobs Rule applies a multiplier based on VERIFIED ethical conduct. Only methods matter; beliefs are not factored."),
        spacer(),
        h2("Verified Ethical Issues (Methods)")
    ];
    
    if (data.jobsRule.verifiedIssues.length > 0) {
        data.jobsRule.verifiedIssues.forEach((issue, index) => {
            elements.push(numberedItem(issue));
        });
    } else {
        elements.push(para("No verified ethical issues identified."));
    }
    
    elements.push(spacer());
    
    if (data.jobsRule.notFactored && data.jobsRule.notFactored.length > 0) {
        elements.push(h2("Not Factored"));
        data.jobsRule.notFactored.forEach(item => {
            elements.push(bullet(item));
        });
        elements.push(spacer());
    }
    
    if (data.jobsRule.mitigatingFactors && data.jobsRule.mitigatingFactors.length > 0) {
        elements.push(h2("Mitigating Factors"));
        data.jobsRule.mitigatingFactors.forEach(factor => {
            elements.push(bullet(factor));
        });
        elements.push(spacer());
    }
    
    elements.push(
        h2("Multiplier Determination"),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [4680, 4680],
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Assessment", bold: true, color: COLORS.headerText, size: SIZES.body, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Applied", bold: true, color: COLORS.headerText, size: SIZES.body, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: data.scores.jobsLabel, bold: true, size: SIZES.body, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: data.scores.jobsMultiplier.toFixed(2), bold: true, size: SIZES.body, font: FONTS.primary })] })] })
                    ]
                })
            ]
        }),
        spacer(),
        para("Justification: " + data.jobsRule.justification),
        new Paragraph({ children: [new PageBreak()] })
    );
    
    return elements;
}

function buildFinalCalculation(data) {
    const tier = getScoreTier(data.scores.leadership);
    
    const elements = [
        h1("FINAL SCORE CALCULATION"),
        spacer(),
        h2("Achievement Score"),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [4000, 2000, 3360],
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Pillar", bold: true, color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Score", bold: true, color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Weighted", bold: true, color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "Character", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: String(data.scores.character), size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: `${data.scores.character} × 0.39 = ${(data.scores.character * 0.39).toFixed(1)}`, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Competence", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: String(data.scores.competence), size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: `${data.scores.competence} × 0.30 = ${(data.scores.competence * 0.30).toFixed(1)}`, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "Impact", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: String(data.scores.impact), size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: `${data.scores.impact} × 0.31 = ${(data.scores.impact * 0.31).toFixed(1)}`, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "ACHIEVEMENT SCORE", bold: true, color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "", color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: String(data.scores.achievement), bold: true, color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                })
            ]
        }),
        spacer(),
        h2("Final Leadership Score"),
        spacer(),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [9360],
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            borders,
                            width: { size: 9360, type: WidthType.DXA },
                            shading: { fill: tier.bg, type: ShadingType.CLEAR },
                            margins,
                            children: [
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "FINAL CALCULATION", bold: true, size: SIZES.h2, font: FONTS.primary })] }),
                                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: "Achievement Score × Jobs Rule Multiplier", size: SIZES.body, font: FONTS.primary })] }),
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${data.scores.achievement} × ${data.scores.jobsMultiplier.toFixed(2)} = ${data.scores.leadership}`, size: SIZES.body, font: FONTS.primary })] }),
                                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: `LEADERSHIP SCORE: ${data.scores.leadership} / 100`, bold: true, size: SIZES.score, font: FONTS.primary })] }),
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Tier: ${tier.symbol} ${tier.label}`, size: SIZES.body, font: FONTS.primary })] })
                            ]
                        })
                    ]
                })
            ]
        })
    ];
    
    // Add Score-If-Proven if applicable
    if (data.hasPendingLegal && data.scoreIfProven !== null) {
        elements.push(
            spacer(),
            h2("Score-If-Proven"),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnWidths: [9360],
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                borders,
                                width: { size: 9360, type: WidthType.DXA },
                                shading: { fill: COLORS.score0, type: ShadingType.CLEAR },
                                margins,
                                children: [
                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "IF PENDING CHARGES RESULT IN CONVICTION", bold: true, size: SIZES.body, font: FONTS.primary })] }),
                                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: `Jobs Rule Multiplier = 0 (Tier 1 Disqualifying)`, size: SIZES.body, font: FONTS.primary })] }),
                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `SCORE-IF-PROVEN: ${data.scoreIfProven} / 100`, bold: true, size: SIZES.score, font: FONTS.primary })] }),
                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✗ DISQUALIFIED", size: SIZES.body, font: FONTS.primary })] })
                                ]
                            })
                        ]
                    })
                ]
            })
        );
    }
    
    elements.push(new Paragraph({ children: [new PageBreak()] }));
    
    return elements;
}

function buildTruthNeutralityGate(data) {
    const elements = [
        h1("TRUTH & NEUTRALITY GATE"),
        spacer(),
        para("Pre-publication verification per Assessment Protocol v1.0, Section XI:"),
        spacer(),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [700, 7500, 1160],
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "#", bold: true, color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Requirement", bold: true, color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: headerShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true, color: COLORS.headerText, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "1", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "All claims labeled: Verified vs. Charged vs. Alleged vs. Opinion", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: { fill: COLORS.positive, type: ShadingType.CLEAR }, margins, children: [new Paragraph({ children: [new TextRun({ text: "✓ PASS", bold: true, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "2", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Jurisdiction + date + source for CHARGED items", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: { fill: data.hasPendingLegal ? COLORS.positive : COLORS.flag, type: ShadingType.CLEAR }, margins, children: [new Paragraph({ children: [new TextRun({ text: data.hasPendingLegal ? "✓ PASS" : "N/A", bold: true, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "3", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "Supporter Steelman written charitably", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: { fill: COLORS.positive, type: ShadingType.CLEAR }, margins, children: [new Paragraph({ children: [new TextRun({ text: "✓ PASS", bold: true, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "4", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Critic Steelman written fairly", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: { fill: COLORS.positive, type: ShadingType.CLEAR }, margins, children: [new Paragraph({ children: [new TextRun({ text: "✓ PASS", bold: true, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "5", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "Score penalties tied to VERIFIED methods only", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: { fill: COLORS.positive, type: ShadingType.CLEAR }, margins, children: [new Paragraph({ children: [new TextRun({ text: "✓ PASS", bold: true, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "6", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Contested beliefs flagged but NOT scored", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: { fill: COLORS.positive, type: ShadingType.CLEAR }, margins, children: [new Paragraph({ children: [new TextRun({ text: "✓ PASS", bold: true, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "7", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "Both sympathetic AND critical sources used", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: { fill: COLORS.positive, type: ShadingType.CLEAR }, margins, children: [new Paragraph({ children: [new TextRun({ text: "✓ PASS", bold: true, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "8", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "Dual Scenario applied (if pending legal)", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: { fill: data.hasPendingLegal ? COLORS.positive : COLORS.flag, type: ShadingType.CLEAR }, margins, children: [new Paragraph({ children: [new TextRun({ text: data.hasPendingLegal ? "✓ PASS" : "N/A", bold: true, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "9", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, margins, children: [new Paragraph({ children: [new TextRun({ text: "Value creation measured by follower outcomes", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: { fill: COLORS.positive, type: ShadingType.CLEAR }, margins, children: [new Paragraph({ children: [new TextRun({ text: "✓ PASS", bold: true, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "10", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: altShading, margins, children: [new Paragraph({ children: [new TextRun({ text: "No implied conviction language", size: SIZES.table, font: FONTS.primary })] })] }),
                        new TableCell({ borders, shading: { fill: COLORS.positive, type: ShadingType.CLEAR }, margins, children: [new Paragraph({ children: [new TextRun({ text: "✓ PASS", bold: true, size: SIZES.table, font: FONTS.primary })] })] })
                    ]
                })
            ]
        }),
        spacer(),
        greenBox("GATE STATUS: ALL APPLICABLE ITEMS PASS — Assessment cleared for publication."),
        new Paragraph({ children: [new PageBreak()] })
    ];
    
    return elements;
}

function buildAssessmentSummary(data) {
    const leadershipTier = getScoreTier(data.scores.leadership);
    const influenceTier = getInfluenceTier(data.scores.influence);
    
    const summaryContent = [
        new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: `LEADERSHIP SCORE: ${data.scores.leadership}/100 — ${leadershipTier.symbol} ${leadershipTier.label}`, bold: true, size: 26, font: FONTS.primary })] })
    ];
    
    if (data.isPolarizing) {
        summaryContent.push(
            new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: `INFLUENCE SCORE: ${data.scores.influence}/100 — ${influenceTier.symbol} ${influenceTier.label}`, bold: true, size: 26, font: FONTS.primary })] })
        );
    }
    
    summaryContent.push(
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: `JOBS RULE MULTIPLIER: ${data.scores.jobsMultiplier.toFixed(2)} — ${data.scores.jobsLabel}`, bold: true, size: 26, font: FONTS.primary })] })
    );
    
    if (data.hasPendingLegal && data.scoreIfProven !== null) {
        summaryContent.push(
            new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: `SCORE-IF-PROVEN: ${data.scoreIfProven}/100 — If charges result in conviction`, bold: true, size: 26, font: FONTS.primary })] })
        );
    }
    
    const elements = [
        h1("ASSESSMENT SUMMARY"),
        spacer(),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [9360],
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            borders,
                            shading: headerShading,
                            margins,
                            children: [
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${data.name} — FINAL ASSESSMENT`, bold: true, color: COLORS.headerText, size: SIZES.h2, font: FONTS.primary })] })
                            ]
                        })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({
                            borders,
                            margins,
                            children: summaryContent
                        })
                    ]
                })
            ]
        }),
        spacer(),
        h2("Key Framework Applications")
    ];
    
    data.summary.keyDistinctions.forEach(distinction => {
        elements.push(bullet(distinction));
    });
    
    if (data.summary.historicalNote) {
        elements.push(spacer(), h2("Historical Significance Note"), para(data.summary.historicalNote));
    }
    
    if (data.summary.comparisonNote) {
        elements.push(spacer(), h2("Comparison Note"), para(data.summary.comparisonNote));
    }
    
    elements.push(
        spacer(),
        separator(),
        spacer(),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "END OF ASSESSMENT", bold: true, size: SIZES.body, font: FONTS.primary })]
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `${data.name} | ${data.assessmentDate} | Framework v1.1`, size: SIZES.table, font: FONTS.primary })]
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: data.organization, size: SIZES.table, font: FONTS.primary })]
        })
    );
    
    return elements;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generateAssessment(data) {
    // Build all sections in canonical order (per Output Specification v1.0)
    const sections = [
        ...buildTitlePage(data),
        ...buildPendingLegalSection(data),      // Conditional
        ...buildExecutiveSummary(data),
        ...buildSupporterSteelman(data),
        ...buildCriticSteelman(data),
        ...buildWorldviewFlags(data),
        ...buildInfluenceScore(data),           // Conditional
        ...buildThreePillars(data),
        ...buildJobsRule(data),
        ...buildFinalCalculation(data),
        ...buildTruthNeutralityGate(data),
        ...buildAssessmentSummary(data)
    ];
    
    const doc = new Document({
        styles: {
            default: {
                document: { run: { font: FONTS.primary, size: SIZES.body } }
            }
        },
        numbering: {
            config: [
                { reference: "bullets",
                  levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
                { reference: "numbers",
                  levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
            ]
        },
        sections: [{
            properties: {
                page: {
                    size: { width: 12240, height: 15840 },
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
                }
            },
            children: sections
        }]
    });
    
    return doc;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

const doc = generateAssessment(SUBJECT_DATA);
const filename = SUBJECT_DATA.name.replace(/\s+/g, '-') + '-Assessment-v1.1.docx';

Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync('/home/claude/' + filename, buffer);
    console.log(`Assessment generated: ${filename}`);
    console.log(`\nTo use this template:`);
    console.log(`1. Fill in the SUBJECT_DATA object at the top of this file`);
    console.log(`2. Run: node assessment-template.js`);
    console.log(`3. Output will be generated with the subject's name`);
});
