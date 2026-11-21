// Public Decision Risk Lens: draft review taxonomy.
//
// Every pattern is a plain, visible word or phrase. A match only means that a
// passage MAY deserve a closer look by a human reviewer. It is never a finding.
// The taxonomy is a first draft and should be developed with practitioners,
// legal experts and affected groups.
//
// Patterns are matched case-insensitively at the start of a word, so
// "profil" also matches "profilering". Keep them short and explainable.

(function (root) {
  const TAXONOMY = [
    {
      id: "transparency",
      label: "Transparency",
      description: "Whether people can see that a tool is used, what it does and on what basis.",
      question: "Would an affected person be able to find out that this tool is used and how it shapes the decision?",
      patterns: {
        en: ["algorithm", "automated decision", "automated processing", "machine learning", "artificial intelligence", "notif", "AI system", "model", "black box", "proprietary", "trade secret"],
        sv: ["algoritm", "automatiser", "underrätt", "maskininlärning", "artificiell intelligens", "AI-system", "modell", "affärshemlighet", "sekretess"]
      }
    },
    {
      id: "accountability",
      label: "Accountability",
      description: "Who is responsible for the tool, its outputs and its errors.",
      question: "Is it clear which named role or body answers for this decision and for mistakes?",
      patterns: {
        en: ["responsible", "responsibility", "liability", "third-party supplier", "supplier", "vendor", "contractor", "outsourc", "delegat"],
        sv: ["ansvar", "ansvarig", "leverantör", "underleverantör", "upphandl", "delegation", "delegera"]
      }
    },
    {
      id: "discrimination",
      label: "Discrimination",
      description: "Whether some groups could be treated less favourably, directly or through proxies.",
      question: "Could this criterion or data source work differently for groups protected by discrimination law?",
      patterns: {
        en: ["risk score", "risk assessment", "profiling", "postcode", "postal code", "neighbourhood", "nationality", "ethnic", "gender", "age group", "disability", "language", "prioritis", "high-risk group"],
        sv: ["riskpoäng", "riskbedömning", "profilering", "postnummer", "bostadsområde", "medborgarskap", "nationalitet", "etnisk", "kön", "ålder", "funktionsnedsättning", "språk", "prioriter"]
      }
    },
    {
      id: "privacy",
      label: "Privacy",
      description: "How personal data is collected, combined, kept and shared.",
      question: "Is the personal data needed for the stated purpose, and is its use limited, lawful and time-bound?",
      patterns: {
        en: ["personal data", "sensitive data", "health data", "data sharing", "share data", "retention", "retain", "combine", "register", "surveillance", "monitor", "GDPR"],
        sv: ["personuppgift", "känsliga uppgifter", "hälsouppgifter", "uppgiftsutbyte", "lagring", "gallring", "samkör", "register", "övervak", "dataskydd", "GDPR"]
      }
    },
    {
      id: "contestability",
      label: "Contestability",
      description: "Whether people can understand, question and challenge a decision.",
      question: "Can an affected person get reasons for the decision and challenge it in practice?",
      patterns: {
        en: ["appeal", "complaint", "challenge", "right to object", "review request", "reasons for the decision", "explanation"],
        sv: ["överklag", "klagomål", "invändning", "ompröv", "motivering", "förklaring"]
      }
    },
    {
      id: "human-oversight",
      label: "Human oversight",
      description: "Whether a person with real authority checks the tool's output before it affects someone.",
      question: "Does a person with competence and authority review the output, and can they overrule it?",
      patterns: {
        en: ["human review", "manual review", "oversight", "caseworker", "case officer", "officer", "fully automated", "without human", "automatically", "override", "sign off", "approve"],
        sv: ["manuell granskning", "handläggare", "mänsklig", "automatiser", "automatiskt", "utan manuell", "godkänn", "beslutsfattare"]
      }
    },
    {
      id: "security",
      label: "Security",
      description: "Protection of systems and data against unauthorised access, loss or manipulation.",
      question: "Who can access the system and its data, and what happens if it is breached or fails?",
      patterns: {
        en: ["security", "access control", "breach", "encryption", "cloud", "hosting", "third country", "logging", "incident"],
        sv: ["säkerhet", "behörighet", "intrång", "kryptering", "molntjänst", "tredjeland", "loggning", "incident"]
      }
    },
    {
      id: "misuse",
      label: "Misuse",
      description: "Use of the tool or its data beyond the original purpose, or in ways that could cause harm.",
      question: "Could the tool or its data be reused for a purpose that was never assessed or authorised?",
      patterns: {
        en: ["misuse", "other purposes", "further use", "repurpos", "secondary use", "future use", "expand", "scale up", "control", "fraud", "sanction"],
        sv: ["missbruk", "andra ändamål", "vidareanvänd", "framtida användning", "utök", "kontroll", "fusk", "bedrägeri", "sanktion"]
      }
    }
  ];

  // Document-level absence checks. If none of these terms appear anywhere,
  // the tool notes that the topic was NOT FOUND IN THIS TEXT. That is a prompt
  // for the reviewer to check other documents, not evidence of a gap.
  const ABSENCE_CHECKS = [
    {
      id: "absence-contestability",
      category: "contestability",
      label: "No mention of appeal or challenge",
      question: "Is the route for appeal or complaint described somewhere else?",
      patterns: ["appeal", "complaint", "challenge", "object", "överklag", "klagomål", "ompröv", "invändning"]
    },
    {
      id: "absence-human-oversight",
      category: "human-oversight",
      label: "No mention of human review",
      question: "Is it described elsewhere who reviews outputs before decisions are made?",
      patterns: ["human review", "manual review", "oversight", "caseworker", "case officer", "handläggare", "manuell granskning", "mänsklig"]
    },
    {
      id: "absence-accountability",
      category: "accountability",
      label: "No named responsibility",
      question: "Is it stated elsewhere which role or body is responsible?",
      patterns: ["responsible", "responsibility", "accountable", "ansvar"]
    },
    {
      id: "absence-transparency",
      category: "transparency",
      label: "No mention of informing affected people",
      question: "Are affected people told that a tool is used, and how?",
      patterns: ["inform", "notif", "explanation", "information", "underrätt", "förklaring"]
    }
  ];

  const api = { TAXONOMY, ABSENCE_CHECKS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RiskLensTaxonomy = api;
})(typeof window !== "undefined" ? window : globalThis);
