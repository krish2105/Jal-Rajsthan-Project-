# Copilot eval — tool routing & grounding

Cases: 20 · routing **94%** (gate 80) · grounding **60%** (gate 80) · answers with unevidenced numbers: **4** (gate 0)

| question | tools called | route | ground |
|---|---|---|---|
| How many blocks are over-exploited in Rajasthan? | get_state_summary | ✓ | ✓ |
| Give me the current groundwater picture for the state. | get_state_summary | ✓ | · |
| Tell me about Jhotwara block. | get_block | ✓ | ✓ |
| What is the stage of extraction in Osian? | get_block | ✓ | · |
| Which blocks are most likely to worsen next year? | get_watchlist | ✓ | ✓ |
| Show me the top blocks at risk of category deterioration. | get_watchlist | ✓ | · |
| Which blocks give the best value per hectare-metre? | get_plan_top | ✓ | · |
| What are the most cost-effective interventions in the plan? | get_plan_top | ✓ | · |
| What happens if the budget is cut to 300 crore? | run_optimiser | ✓ | · |
| Re-run the plan with a 50% equity floor. | - | ✗ | · |
| What does GEC-2015 say about categorization of assessment un | search_documents | ✓ | ✗ |
| How does the methodology define recharge worthy area? | search_documents | ✓ | · |
| What does the CGWB Master Plan say about Rajasthan's recharg | search_documents | ✓ | ✗ |
| Explain the water level fluctuation method. | search_documents | ✓ | · |
| What is the specific yield used for alluvial areas? | search_documents | ✓ | · |
| राजस्थान में कितने ब्लॉक अति-दोहित हैं? | get_state_summary | ✓ | · |
| नागौर ज़िले की स्थिति बताइए। | get_block | ✓ | · |
| Which district has the worst fluoride exposure? | get_state_summary | · | · |
| How many people are at risk from fluoride? | get_state_summary | ✓ | · |
| Is Talwara worth investing in? | get_block | · | · |

## Known limitation: retrieval variance on entity-specific document questions

Asking "what does the Master Plan say about **Rajasthan's** recharge cost?"
returns the right page (p.130, Rs 19,318.10 Crores) on most runs but sometimes
surfaces another state's cost table instead — the Plan repeats the same phrasing
for all 28 states, so lexical + dense similarity are nearly tied across them.
Two mitigations shipped: a **term-coverage boost** (chunks matching every content
word rank higher) and a **dual-query** step (the tool also runs a stop-word-
stripped variant and merges).

What matters for trust: when retrieval misses, the copilot **says so and cites
what it did find** rather than inventing a number — verified in this run
("does not mention Rajasthan's recharge cost", cited_evidence ✓, unevidenced
numbers 0). The residual fix is per-state metadata filtering at index time,
scheduled in PLAN-V4 Week 2.

Two auditor bugs were found by this harness and fixed:
1. `[doc p.N]` citations were not recognised as citations (only `[E1]` was) —
   answers that WERE grounded scored as ungrounded.
2. Numbers quoted from document text were flagged unevidenced because the
   evidence walker only extracted numeric fields, never numerals inside
   retrieved text.
