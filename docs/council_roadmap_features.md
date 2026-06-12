# KAVACH — Council Output: Round 2/Tokyo Roadmap Features

## Context
KAVACH (solar storm alert system, calls Indian farmers in Hindi via Twilio) just finished Round 1 
for FAR AWAY 2026. These are the 6 features selected for the Round 2/Tokyo roadmap slide.

---

## 🏆 FLAGSHIP FEATURE (leads the roadmap slide)

### Multi-Language Expansion — "Every Indian, warned in their mother tongue"

**One-line pitch:**  
*KAVACH speaks every Indian language — Hindi base + Tamil, Telugu, Marathi, Bengali, Punjabi, 
Gujarati, Kannada by DISCOM zone, with English as universal fallback.*

**Why it's the flagship:**  
- India has 22 official languages. KAVACH's Hindi-only reach excludes 600M+ people.
- Language detection is automatic — a farmer's DISCOM zone maps to their dominant language.
- No change in hardware needed — the same feature phone. Just a different voice.
- Unlocks Tamil Nadu, Maharashtra, West Bengal, Kerala DISCOM contracts.
- The Twilio Polly voice pipeline already exists — adding a language is a config change, not a rebuild.

**Implementation path:**  
Amazon Polly supports: Aditi (hi-IN), Kajal (ta-IN), Telugu (te-IN), Raveena (mr-IN fallback), 
Priyanka (bn-IN), Suvi (gu-IN). DISCOM ID → language mapping already in `discom_mapper.py`.

---

## FEATURES 2–6

### 2. ISRO VEDAS Integration — "Indian satellite data for Indian storms"

**One-line pitch:**  
*KAVACH ingests ionospheric scintillation from ISRO's VEDAS system — adding GPS accuracy 
forecasting that no foreign space weather tool provides for India specifically.*

**Why it matters:**  
VEDAS (Versatile Atmospheric Dispatch and Archival System) tracks real-time ionospheric conditions 
over India. GPS-guided agriculture fails during ionospheric scintillation before the magnetic storm 
peaks. KAVACH with VEDAS gives 30–60 min additional warning for GPS-dependent systems.

**Credibility:** ISRO VEDAS API is documented at vedas.sac.gov.in. Solo integration within 2 weeks.

---

### 3. WhatsApp + SMS Fallback Layer — "No phone rings? Message arrives."

**One-line pitch:**  
*When the voice call fails or the number is busy, KAVACH auto-sends a WhatsApp/SMS alert in 
the subscriber's language — zero missed warnings.*

**Why it matters:**  
In India, WhatsApp penetration is 500M+. Even farmers without smartphones use WhatsApp on 
feature-phone-tier Android. Twilio's WhatsApp Business API integrates with the same codebase.  
Fallback chain: Voice call → WhatsApp → SMS → next person on the list.

---

### 4. DISCOM Operator Dashboard (SaaS portal) — "The product that pays the bills"

**One-line pitch:**  
*A dedicated web portal for DISCOM grid operators: live storm forecasts, transformer risk maps, 
one-click protective relay commands — built for revenue, not just demo.*

**Why it matters:**  
The free consumer alert is the top-of-funnel. The ₹2–5L/month DISCOM contract requires a 
purpose-built operator interface: 72-hour forecasts, historical analysis, export to their SCADA 
systems. This is what turns KAVACH from a hackathon demo into a procurement-ready product.

---

### 5. Transformer Damage Probability Model — "Tell them exactly what's at risk"

**One-line pitch:**  
*KAVACH calculates per-transformer failure probability by age, manufacturer, and storm intensity — 
so DISCOMs prioritize which substations to manually isolate first.*

**Why it matters:**  
India's grid has thousands of transformers, many 20–30 years old. At Kp=9.0, they don't all fail 
equally. A model combining transformer metadata (publicly available from CERC filings) with storm 
Kp trajectory gives operators a ranked list: "Isolate Agra NE substation first, then Rohtak Central."  
This is the feature that turns a ₹3L/month contract into a ₹10L/month one.

---

### 6. Predictive Storm Arrival Window (CME Transit Modeling) — "Hours more warning"

**One-line pitch:**  
*KAVACH integrates NASA CME trajectory data to compute India-specific arrival windows — 
turning a 30-minute generic alert into a 4–18 hour precise countdown.*

**Why it matters:**  
Current Kp-index alerts are reactive (storm is already arriving). NASA DONKI CMEAnalysis 
provides CME speed and direction. KAVACH can compute the Earth-impact window from departure, 
giving farmers and grid operators 4–18 hours of advance notice instead of 30 minutes.  
This is technically available in Phase 1 data (we already poll DONKI CMEAnalysis) — the 
modeling logic is the addition.

---

## PRIORITY ORDER FOR TOKYO SLIDE

| Rank | Feature | Why This Rank |
|------|---------|---------------|
| 1 | Multi-Language Expansion | Biggest reach impact, most emotionally resonant to judges |
| 2 | DISCOM Operator Dashboard | Revenue credibility — shows path to real contracts |
| 3 | Transformer Damage Model | Technical depth — differentiates from "just alerts" |
| 4 | CME Transit Modeling | Turns KAVACH from reactive to predictive |
| 5 | WhatsApp + SMS Fallback | Practical completeness of the alert pipeline |
| 6 | ISRO VEDAS Integration | India-specific moat — "no foreign system does this for India" |
