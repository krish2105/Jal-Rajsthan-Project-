# Copilot eval — tool routing & grounding

Cases: 20 · routing **89%** (gate 80) · grounding **75%** (gate 80) · answers with unevidenced numbers: **3** (gate 0)

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
| What happens if the budget is cut to 300 crore? | - | ✗ | · |
| Re-run the plan with a 50% equity floor. | - | ✗ | · |
| What does GEC-2015 say about categorization of assessment un | search_documents | ✓ | · |
| How does the methodology define recharge worthy area? | search_documents | ✓ | · |
| What does the CGWB Master Plan say about Rajasthan's recharg | search_documents | ✓ | ✗ |
| Explain the water level fluctuation method. | search_documents | ✓ | · |
| What is the specific yield used for alluvial areas? | search_documents | ✓ | · |
| राजस्थान में कितने ब्लॉक अति-दोहित हैं? | get_state_summary | ✓ | · |
| नागौर ज़िले की स्थिति बताइए। | get_block | ✓ | · |
| Which district has the worst fluoride exposure? | search_documents | · | · |
| How many people are at risk from fluoride? | get_state_summary | ✓ | · |
| Is Talwara worth investing in? | get_block | · | · |
