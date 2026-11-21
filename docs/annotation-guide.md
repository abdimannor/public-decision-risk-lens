# Annotation guide (version 1, November 2026)

This guide defines when a passage in a public decision text gets a category label in the evaluation sets (`prototype/eval/*.json`). The same definitions describe what the tool's flags are meant to catch. A label means: a human reviewer would genuinely want to ask this category's review question about this passage. It is never a finding that something is wrong.

The unit is (passage, category). A passage can have several labels or none. Passages with no label count for precision.

## The rule for bare mentions of automation and AI

**A passage that only mentions automation, automated decision-making, an algorithm, a model, machine learning or AI gets no transparency or human-oversight label for that mention.** It gets the neutral context signal "Mentions automation" in the tool instead.

A mention becomes a transparency label only when the passage also addresses whether affected people (or the officials who rely on the tool) can know that the tool is used, what it does, on what basis, or how a decision came about: information duties, explanations, documentation, reasons, secrecy, trade secrets, a black box.

A mention becomes a human-oversight label only when the passage also addresses whether a person checks, controls, corrects, approves or can overrule the output, or states that an outcome reaches a person with no human step in between.

Why: the tool exists so that a reviewer finds the passages where a decision's openness, oversight or contestability is at stake. In texts about automated decision-making almost every sentence names the technology. Flagging every such sentence as a risk buries the passages that actually say something about information, control or appeal, and it trains the reviewer to ignore flags. That automation is in play is still useful to know, so the tool shows it as context, separate from the risk flags and outside every count.

## Categories

### Transparency
- **Definition:** whether people can see that a tool is used, what it does and on what basis a decision was made.
- **Counts:** duties to inform or notify about a decision or its content; explanations, logic, reasons; documentation that lets someone trace how a decision was made; secrecy, trade secrets, proprietary models, black-box problems; exceptions that limit what people are told.
- **Does not count:** a bare statement that a tool, model or automation is used; a technical description of the tool (training data, inputs) that says nothing about who can see it; routine notices unrelated to a decision (a delay notice).
- **Borderline examples (invented):**
  - "The council will use a scoring model to sort applications." No label: bare mention (context signal only).
  - "Applicants are told in the decision letter that a scoring model sorted their application." Label: it is about informing the affected person.
  - "The model uses income and household size as inputs." No transparency label: a description of inputs. It may be privacy or discrimination.

### Accountability
- **Definition:** who is responsible for the tool, its outputs and its errors.
- **Counts:** named or missing responsibility; suppliers, contractors, delegation; criticism of who answers for an error.
- **Does not count:** a body named only as the author of the text.
- **Borderline examples (invented):**
  - "The IT unit maintains the tool on behalf of the board." Label: responsibility is split between bodies.
  - "The board adopted this decision on 3 March." No label: a formal statement of who decided, no question of responsibility for the tool.

### Discrimination
- **Definition:** whether some groups could be treated less favourably, directly or through proxies.
- **Counts:** risk scores and profiling that sort people; protected grounds; proxies such as postcode or language; bias; unequal outcomes.
- **Does not count:** profiling mentioned only as a legal definition with no sorting of people; equal treatment named as a goal with no criterion.
- **Borderline examples (invented):**
  - "Applications from postcode areas with many earlier cases are prioritised." Label: postcode works as a proxy.
  - "The agency aims to treat all applicants equally." No label.

### Privacy
- **Definition:** how personal data is collected, combined, kept and shared.
- **Counts:** personal or sensitive data, combining registers, retention and deletion, sharing, monitoring, legal basis, data subject rights.
- **Does not count:** naming the GDPR with no personal data at stake.
- **Borderline examples (invented):**
  - "Data from the housing register is matched with the application." Label: registers are combined.
  - "This policy follows the GDPR." No label.

### Contestability
- **Definition:** whether people can understand, question and challenge a decision.
- **Counts:** appeal, complaint, objection, reconsideration, reasons for a decision, explanations an affected person can use, anything that blocks these in practice.
- **Does not count:** an internal review of the tool's performance that the affected person cannot use.
- **Borderline examples (invented):**
  - "A decision made with the tool can be appealed to the administrative court." Label.
  - "The tool's accuracy is reviewed every year." No contestability label (possibly human oversight).

### Human oversight
- **Definition:** whether a person with real authority checks the tool's output before it affects someone.
- **Counts:** human or manual review, control, correction, approval, override; limits on a caseworker's authority to act on errors; outcomes applied with no human step; lacking or missing manual control of automated decisions.
- **Does not count:** a bare statement that decisions are or may be automated; a person named only as the one who signs the policy.
- **Borderline examples (invented):**
  - "Decisions on the allowance may be taken automatically." No label: bare mention (context signal only).
  - "Low-priority cases are closed automatically without a caseworker seeing them." Label: an outcome with no human step.
  - "A caseworker checks every flagged case before a decision is sent." Label: a human check.

### Security
- **Definition:** protection of systems and data against unauthorised access, loss or manipulation.
- **Counts:** access control, breaches, encryption, hosting, cloud, logging, incidents, data leaking to an external service.
- **Does not count:** "säkerhet" meaning national or public safety; a third country named only as a transfer question (privacy).
- **Borderline examples (invented):**
  - "The service runs on servers in a supplier's cloud." Label.
  - "The measure strengthens public safety in the city centre." No label.

### Misuse
- **Definition:** use of the tool or its data beyond the original purpose, or in ways that could cause harm.
- **Counts:** further or secondary use, function creep, expansion to new areas, purpose limitation, foreseeable misuse, fraud control used as a sanction.
- **Does not count:** a plain statement of the tool's single purpose.
- **Borderline examples (invented):**
  - "The board may later extend the tool to other services." Label: expansion beyond the assessed purpose.
  - "The tool sorts home-care applications." No label.

## Process

- Read only the passage text and this guide. Do not run the engine while labelling, and commit labels before running an evaluation.
- Record every changed label in `docs/relabel-log.md` with the rule used.
- One annotator (an AI agent) has labelled all sets. There is no inter-annotator agreement and no check by a lawyer or domain expert yet.

## Sammanfattning på svenska

Guiden beskriver när ett stycke får en kategori i utvärderingsmängderna. En etikett betyder att en granskare på allvar skulle vilja ställa kategorins granskningsfråga om stycket, aldrig att något är fel. Huvudregeln: ett stycke som bara nämner automatisering, algoritmer, modeller, maskininlärning eller AI får ingen etikett för transparens eller mänsklig kontroll. Verktyget visar då en neutral kontextmarkering, "Nämner automatisering", som inte räknas som riskflagga. Transparens kräver att stycket handlar om vad berörda får veta (information, förklaring, dokumentation, sekretess). Mänsklig kontroll kräver att stycket handlar om att en person granskar, rättar eller kan ändra utfallet, eller att ett utfall når en person utan något mänskligt steg. Skälet är verktygets syfte: granskaren ska hitta de stycken där ett besluts öppenhet, kontroll eller möjlighet att överklaga står på spel, inte varje mening som nämner teknik.
