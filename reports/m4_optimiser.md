# M4 — recharge siting optimiser

Status **Optimal** in 25.2s (budget ₹60000 lakh, equity >= 25% to fluoride blocks).
Plan: 26160 structures across 57 blocks; total recharge 29626 ham/yr at ₹60000 lakh.

## Lift vs baselines (identical budget, risk-weighted ham objective)

- vs uniform allocation: **+68.8%**
- vs severity-ranked allocation: **-11.9%**

## Top 25 blocks by cost-effectiveness (₹ lakh per hectare-metre)

|                              |   cost_lakh |   recharge_ham |   lakh_per_ham |
|:-----------------------------|------------:|---------------:|---------------:|
| ('AMBER_RURAL', 'JAIPUR')    |       538.8 |          269.4 |            2.0 |
| ('LACHHMANGARH', 'SIKAR')    |      1200.0 |          600.0 |            2.0 |
| ('LOHAWAT', 'JODHPUR')       |      1200.0 |          600.0 |            2.0 |
| ('MERTA', 'NAGAUR')          |      1200.0 |          600.0 |            2.0 |
| ('MUNDWA', 'NAGAUR')         |      1200.0 |          600.0 |            2.0 |
| ('NEEM KA THANA', 'SIKAR')   |       744.8 |          372.4 |            2.0 |
| ('NOKHA', 'BIKANER')         |       531.2 |          265.6 |            2.0 |
| ('OSIAN', 'JODHPUR')         |      1200.0 |          600.0 |            2.0 |
| ('PHALODI', 'JODHPUR')       |      1200.0 |          600.0 |            2.0 |
| ('PIPAR CITY', 'JODHPUR')    |      1200.0 |          600.0 |            2.0 |
| ('RAJGARH', 'CHURU')         |      1200.0 |          600.0 |            2.0 |
| ('RANIWARA', 'JALOR')        |      1168.4 |          584.2 |            2.0 |
| ('RENI', 'ALWAR')            |       422.4 |          211.2 |            2.0 |
| ('SAM', 'JAISALMER')         |      1200.0 |          600.0 |            2.0 |
| ('SANGANER_RURAL', 'JAIPUR') |       656.4 |          328.2 |            2.0 |
| ('SANKRA', 'JAISALMER')      |      1200.0 |          600.0 |            2.0 |
| ('SAYLA', 'JALOR')           |      1200.0 |          600.0 |            2.0 |
| ('SHEKHALA', 'JODHPUR')      |      1200.0 |          600.0 |            2.0 |
| ('SHEO', 'BARMER')           |      1200.0 |          600.0 |            2.0 |
| ('SURAJGARH', 'JHUNJHUNU')   |       989.2 |          494.6 |            2.0 |
| ('KHEENVSAR', 'NAGAUR')      |      1200.0 |          600.0 |            2.0 |
| ('JHOTWARA_RURAL', 'JAIPUR') |       384.0 |          192.0 |            2.0 |
| ('LAWAN', 'DAUSA')           |       204.8 |          102.4 |            2.0 |
| ('UDAIPURWATI', 'JHUNJHUNU') |       911.2 |          455.6 |            2.0 |
| ('JALSOO', 'JAIPUR')         |       528.4 |          264.2 |            2.0 |

Unit costs and per-structure recharge are stated config assumptions
(config/structures.yaml); the ranking, not the absolute ham, is the output.
