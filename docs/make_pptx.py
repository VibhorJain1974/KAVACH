"""Generate KAVACH_FARAWAY2026.pptx — 14-slide dark space theme presentation."""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt
import copy

# Colors
VOID    = RGBColor(0x05, 0x0d, 0x18)
DEEP    = RGBColor(0x0a, 0x16, 0x28)
ACCENT  = RGBColor(0x00, 0xd4, 0xff)
GREEN   = RGBColor(0x00, 0xff, 0x88)
RED     = RGBColor(0xff, 0x2d, 0x4a)
YELLOW  = RGBColor(0xff, 0xd2, 0x3f)
WHITE   = RGBColor(0xe0, 0xe0, 0xff)
MUTED   = RGBColor(0x88, 0x88, 0xbb)
ORANGE  = RGBColor(0xff, 0x6b, 0x35)

W = Inches(13.33)
H = Inches(7.5)

prs = Presentation()
prs.slide_width  = W
prs.slide_height = H

blank = prs.slide_layouts[6]  # completely blank


def add_slide():
    return prs.slides.add_slide(blank)


def bg(slide, color=VOID):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def box(slide, left, top, width, height,
        text="", font_size=18, bold=False, color=WHITE,
        align=PP_ALIGN.LEFT, bg_color=None, border_color=None,
        italic=False, font_name="Calibri"):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    if bg_color:
        txBox.fill.solid()
        txBox.fill.fore_color.rgb = bg_color
    if border_color:
        txBox.line.color.rgb = border_color
        txBox.line.width = Pt(0.75)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.name = font_name
    return txBox


def label(slide, text, top=Inches(0.5)):
    box(slide, Inches(0.6), top, Inches(12), Inches(0.35),
        text=text, font_size=9, color=ACCENT, font_name="Courier New")


def h1(slide, text, top=Inches(1.0), size=52):
    box(slide, Inches(0.6), top, Inches(12), Inches(1.4),
        text=text, font_size=size, bold=True, color=WHITE)


def h2(slide, text, top=Inches(1.0), size=32):
    box(slide, Inches(0.6), top, Inches(12), Inches(1.1),
        text=text, font_size=size, bold=True, color=WHITE)


def body(slide, text, top=Inches(2.2), size=16, color=WHITE, width=Inches(12)):
    box(slide, Inches(0.6), top, width, H - top - Inches(0.4),
        text=text, font_size=size, color=color)


def slide_num(slide, n, total=14):
    box(slide, Inches(11.8), Inches(7.1), Inches(1.4), Inches(0.35),
        text=f"{n:02d} / {total}", font_size=8, color=MUTED,
        align=PP_ALIGN.RIGHT, font_name="Courier New")


def stat_card(slide, left, top, w, h, val, lbl, val_color=ACCENT):
    box(slide, left, top, w, h, bg_color=RGBColor(0x05, 0x12, 0x20),
        border_color=RGBColor(0x00, 0x44, 0x66))
    box(slide, left+Inches(0.1), top+Inches(0.1), w-Inches(0.2), Inches(0.6),
        text=val, font_size=28, bold=True, color=val_color, font_name="Courier New")
    box(slide, left+Inches(0.1), top+Inches(0.65), w-Inches(0.2), Inches(0.45),
        text=lbl, font_size=9, color=MUTED, font_name="Courier New")


def bullet_list(slide, items, top=Inches(2.2), size=15):
    y = top
    for item in items:
        box(slide, Inches(0.6), y, Inches(0.3), Inches(0.4),
            text="›", font_size=size+2, color=ACCENT, bold=True)
        box(slide, Inches(1.0), y, Inches(11.7), Inches(0.45),
            text=item, font_size=size, color=WHITE)
        y += Inches(0.55)


# ── SLIDE 1: TITLE ────────────────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 1)
label(s, "FAR AWAY 2026  ·  SPACE & AEROSPACE")
h1(s, "KAVACH", top=Inches(1.2), size=72)
box(s, Inches(0.6), Inches(2.9), Inches(10), Inches(0.6),
    text='"It called the farmer before the lights went out."',
    font_size=18, color=MUTED, italic=True)
for i, (txt, col) in enumerate([
    ("AUTONOMOUS SPACE WEATHER SHIELD", ACCENT),
    ("INDIA · 1.4B PEOPLE", GREEN),
    ("TEAM 404_SHINOBI", YELLOW),
]):
    box(s, Inches(0.6 + i*3.9), Inches(3.8), Inches(3.7), Inches(0.45),
        text=txt, font_size=9, color=col,
        bg_color=RGBColor(0x04, 0x1a, 0x2a), border_color=RGBColor(0x00, 0x44, 0x66),
        font_name="Courier New")

# ── SLIDE 2: THE HOOK ─────────────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 2)
label(s, "MAY 10, 2024")
h2(s, "A solar storm hit Earth.", top=Inches(1.1), size=34)
box(s, Inches(0.6), Inches(2.15), Inches(0.1), Inches(3.5),
    bg_color=ACCENT)  # left accent bar
box(s, Inches(0.9), Inches(2.2), Inches(11.5), Inches(3.4),
    text=(
        "Indian farmers' GPS-guided tractors stopped working mid-ploughing.\n\n"
        "Fishermen on the Kerala coast lost marine radio contact.\n\n"
        "India's power grid came within hours of widespread failure.\n\n"
        "Nobody called a single farmer."
    ),
    font_size=17, color=MUTED, italic=True)
box(s, Inches(0.6), Inches(6.0), Inches(9), Inches(0.45),
    text="Aurora photo: Dorje Angchuk · Hanle Observatory, IAO · May 2024",
    font_size=9, color=MUTED)

# ── SLIDE 3: THE PROBLEM ──────────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 3)
label(s, "THE PROBLEM")
h2(s, "India has no space weather warning system.", top=Inches(1.1))
bullet_list(s, [
    "1.4 billion people — 28 power utilities, zero automated early warning",
    "Existing systems: English-only, internet-only, built for the American grid",
    "GPS failure hits farmers & fishermen first — no app, no internet, no alert",
    "₹3,000 crore in transformer assets at risk every G5 event",
], top=Inches(2.5))

# ── SLIDE 4: WHAT IT DOES ─────────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 4)
label(s, "KAVACH — WHAT IT DOES")
h2(s, "Three actions. Fully autonomous. Zero human trigger.", top=Inches(1.1))
cw = Inches(3.9)
for i, (num, title, desc) in enumerate([
    ("01", "MONITOR", "NASA DONKI + NOAA SWPC polled every 15 min. No human watches."),
    ("02", "MAP", "Storm risk mapped to India's 28 DISCOM zones, north first."),
    ("03", "CALL", "Hindi voice alert to farmers on basic feature phones. No app needed."),
]):
    x = Inches(0.5 + i * 4.27)
    box(s, x, Inches(2.4), cw, Inches(3.5),
        bg_color=RGBColor(0x04, 0x10, 0x1e), border_color=RGBColor(0x00, 0x44, 0x66))
    box(s, x+Inches(0.15), Inches(2.55), cw, Inches(0.6),
        text=num, font_size=28, bold=True, color=ACCENT, font_name="Courier New")
    box(s, x+Inches(0.15), Inches(3.2), cw, Inches(0.45),
        text=title, font_size=13, bold=True, color=ACCENT)
    box(s, x+Inches(0.15), Inches(3.7), cw-Inches(0.3), Inches(1.8),
        text=desc, font_size=13, color=MUTED)
box(s, Inches(0.5), Inches(6.1), Inches(12.3), Inches(0.55),
    text='"Namaste. Main KAVACH bol raha hoon. Ek bada solar toofan aa raha hai. Apni bijli band karein."',
    font_size=12, color=GREEN,
    bg_color=RGBColor(0x01, 0x14, 0x0a), border_color=RGBColor(0x00, 0x66, 0x33),
    font_name="Courier New")

# ── SLIDE 5: LIVE DEMO ────────────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 5)
label(s, "LIVE DEMO — MAY 2024 REPLAY")
h2(s, "Watch 4.5 hours of warning compress into 90 seconds.", top=Inches(1.1))
steps = [
    ("T+0s",  "KAVACH monitoring — all nominal"),
    ("T+3s",  "CME detected — May 8 X-class solar flare"),
    ("T+5s",  "NASA confirms Kp=9.0 — EXTREME"),
    ("T+14s", "India map → ALL RED"),
    ("T+17s", "Alert log — 28 DISCOMs, 12,400 farmers"),
    ("T+20s", "HINDI CALL FIRES — LIVE"),
]
for i, (t, desc) in enumerate(steps):
    y = Inches(2.4 + i * 0.72)
    col = GREEN if "CALL" in desc else (RED if "RED" in desc else WHITE)
    box(s, Inches(0.6), y, Inches(1.1), Inches(0.55),
        text=t, font_size=11, color=ACCENT, font_name="Courier New",
        bg_color=RGBColor(0x03, 0x0e, 0x1a), border_color=RGBColor(0x00, 0x33, 0x55))
    box(s, Inches(1.85), y, Inches(6.5), Inches(0.55),
        text=desc, font_size=13, color=col,
        bg_color=RGBColor(0x03, 0x0e, 0x1a), border_color=RGBColor(0x00, 0x22, 0x44))
stat_card(s, Inches(9.3), Inches(2.4), Inches(3.6), Inches(1.1), "22.6s", "DEMO TIMING", GREEN)
stat_card(s, Inches(9.3), Inches(3.65), Inches(3.6), Inches(1.1), "LIVE", "VERCEL + RAILWAY", GREEN)

# ── SLIDE 6: ARCHITECTURE ─────────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 6)
label(s, "ARCHITECTURE")
h2(s, "Autonomous. Stateless. Continuously polling.", top=Inches(1.1))
nodes = ["NASA DONKI\n15-min", "NOAA SWPC\n5-min", "KAVACH\nFastAPI", "Storm\nClassifier", "DISCOM\nMapper ×28", "Twilio\nHindi Call", "Farmer\nPhone"]
arrows = ["→","→","→","→","→","→"]
nw = Inches(1.55)
for i, node in enumerate(nodes):
    x = Inches(0.3 + i * 1.87)
    col = ACCENT if i == 2 else (GREEN if i == 6 else WHITE)
    bc = ACCENT if i == 2 else RGBColor(0x00, 0x33, 0x55)
    box(s, x, Inches(2.5), nw, Inches(0.95),
        text=node, font_size=10, color=col, align=PP_ALIGN.CENTER,
        bg_color=RGBColor(0x03, 0x10, 0x20), border_color=bc)
    if i < len(arrows):
        box(s, x + nw, Inches(2.7), Inches(0.32), Inches(0.5),
            text="→", font_size=14, color=ACCENT, align=PP_ALIGN.CENTER)
stats = [("28", "DISCOMs mapped"), ("15min", "polling"), ("0", "human triggers"), ("4.5h", "warning window")]
for i, (v, l) in enumerate(stats):
    stat_card(s, Inches(0.4 + i * 3.25), Inches(3.8), Inches(3.0), Inches(1.2), v, l,
              [ACCENT, GREEN, YELLOW, RED][i])

# ── SLIDE 7: DATA SOURCES ─────────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 7)
label(s, "DATA SOURCES")
h2(s, "100% real APIs. Zero mocked data.", top=Inches(1.1))
rows = [
    ("NASA DONKI",      "Geomagnetic storm events, CME trajectory",    "Event-driven", "LIVE", GREEN),
    ("NOAA SWPC",       "Real-time Kp-index (1-minute resolution)",    "1 minute",     "LIVE", GREEN),
    ("ISRO MOSDAC",     "Ionospheric scintillation over India",        "—",            "Phase 2", YELLOW),
    ("Twilio Polly.Aditi", "Hindi TTS voice calls (hi-IN)",           "On-demand",    "LIVE", GREEN),
]
headers = ["Source", "Data", "Update Freq", "Status"]
col_x = [Inches(0.5), Inches(2.8), Inches(8.2), Inches(10.7)]
col_w = [Inches(2.2), Inches(5.3), Inches(2.4), Inches(2.2)]
y = Inches(2.3)
for j, h_txt in enumerate(headers):
    box(s, col_x[j], y, col_w[j], Inches(0.42),
        text=h_txt, font_size=10, color=ACCENT, font_name="Courier New",
        border_color=RGBColor(0x00, 0x33, 0x55))
for row in rows:
    y += Inches(0.75)
    for j, cell in enumerate(row[:4]):
        box(s, col_x[j], y, col_w[j], Inches(0.65),
            text=cell, font_size=12,
            color=row[4] if j == 3 else WHITE,
            border_color=RGBColor(0x00, 0x22, 0x44))

# ── SLIDE 8: MEMORY / PROOF ───────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 8)
label(s, "KAVACH MEMORY — THE PROOF")
h2(s, "We applied KAVACH retroactively to every major storm since 2003.", top=Inches(1.1))
storms = [
    ("2003", "Halloween Storm",          "Kp=9.0", "8h warning",  ORANGE),
    ("2015", "St. Patrick's Day Storm",  "Kp=8.0", "6h warning",  ACCENT),
    ("2017", "September X9.3 Flare",     "Kp=8.0", "5h warning",  YELLOW),
    ("2024", "May 2024 G5 — Origin Story","Kp=9.0","4.5h warning", RED),
]
for i, (yr, name, kp, warn, col) in enumerate(storms):
    y = Inches(2.45 + i * 0.88)
    box(s, Inches(0.5), y, Inches(0.8), Inches(0.7),
        text=yr, font_size=13, bold=True, color=col,
        bg_color=RGBColor(0x04, 0x10, 0x1e), border_color=col, font_name="Courier New")
    box(s, Inches(1.45), y, Inches(5.8), Inches(0.7),
        text=name, font_size=13, color=col if yr=="2024" else WHITE,
        bg_color=RGBColor(0x04, 0x10, 0x1e), border_color=RGBColor(0x00, 0x22, 0x44))
    box(s, Inches(7.35), y, Inches(1.6), Inches(0.7),
        text=kp, font_size=12, color=MUTED,
        bg_color=RGBColor(0x04, 0x10, 0x1e), border_color=RGBColor(0x00, 0x22, 0x44),
        font_name="Courier New")
    box(s, Inches(9.05), y, Inches(1.9), Inches(0.7),
        text=warn, font_size=12, color=GREEN,
        bg_color=RGBColor(0x01, 0x14, 0x0a), border_color=RGBColor(0x00, 0x55, 0x22),
        font_name="Courier New")
stat_card(s, Inches(0.5),  Inches(6.2), Inches(3.8), Inches(1.0), "847",    "Alerts that would have fired",    RED)
stat_card(s, Inches(4.5),  Inches(6.2), Inches(4.0), Inches(1.0), "12,400", "Farmers called per storm",        YELLOW)
stat_card(s, Inches(8.65), Inches(6.2), Inches(4.3), Inches(1.0), "0",      "Actual alerts (no system existed)", MUTED)

# ── SLIDE 9: DAILY SHIELD ─────────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 9)
label(s, "DAILY SHIELD")
h2(s, "Not just emergencies. 365 days a year.", top=Inches(1.1))
box(s, Inches(0.6), Inches(2.2), Inches(5.5), Inches(4.5),
    text=(
        "Every morning at 6:30 AM IST:\n\n"
        "KAVACH Suraksha Sandesh — June 12\n"
        "Space Weather Score: 95 / 100\n"
        "GPS Shuddhata: Normal\n"
        "Grid Suraksha: Minimal\n"
        "KAVACH active hai."
    ),
    font_size=14, color=GREEN,
    bg_color=RGBColor(0x01, 0x14, 0x0a), border_color=RGBColor(0x00, 0x66, 0x33),
    font_name="Courier New")
bullet_list(s, [
    "Score 0–100: 100 = perfect solar conditions, 12 = G5 extreme",
    "Hindi version for farmers · English for DISCOM operators",
    "GPS status + grid risk + recommended actions included",
    "Aurora visibility forecast for Hanle, Pangong, Ladakh",
], top=Inches(2.2))

# fix bullet positions to right column
# (already placed at 0.6 — move them right, quick workaround: rebuild)
# Actually bullet_list places at 0.6 which overlaps — we rewrite that part
# Delete last 4 shapes and redo at x=6.5
for _ in range(8):  # 8 shapes (icon + text per bullet) — remove last 8
    sp = s.shapes[-1]
    sp._element.getparent().remove(sp._element)

bullet_items = [
    "Score 0–100: 100 = perfect solar, 12 = G5 extreme",
    "Hindi for farmers · English for DISCOM operators",
    "GPS status + grid risk + recommended actions",
    "Aurora forecast for Hanle, Pangong, Ladakh",
]
y = Inches(2.2)
for item in bullet_items:
    box(s, Inches(6.3), y, Inches(0.3), Inches(0.5), text="›", font_size=15, color=ACCENT, bold=True)
    box(s, Inches(6.7), y, Inches(6.3), Inches(0.55), text=item, font_size=14, color=WHITE)
    y += Inches(0.72)

# ── SLIDE 10: REVENUE ─────────────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 10)
label(s, "REVENUE MODEL")
h2(s, "Built for revenue from day one.", top=Inches(1.1))
tiers = [
    ("Free Tier",     "Public alerts — farmers, fishermen, citizens",         "₹0",           WHITE),
    ("DISCOM API",    "Per-utility: 72h forecast, operator dashboard",        "₹2–5L / month", ACCENT),
    ("5 DISCOMs",     "Year 1 ARR target",                                    "₹1.8Cr / year", GREEN),
    ("Phase 2",       "Aviation · Telecom · Insurance APIs",                  "TBD",           YELLOW),
]
for i, (tier, desc, price, col) in enumerate(tiers):
    y = Inches(2.4 + i * 1.0)
    box(s, Inches(0.5), y, Inches(3.5), Inches(0.85),
        text=tier, font_size=15, bold=True, color=col,
        bg_color=RGBColor(0x04, 0x10, 0x20), border_color=RGBColor(0x00, 0x33, 0x55))
    box(s, Inches(4.1), y, Inches(6.5), Inches(0.85),
        text=desc, font_size=13, color=MUTED,
        bg_color=RGBColor(0x04, 0x10, 0x20), border_color=RGBColor(0x00, 0x22, 0x44))
    box(s, Inches(10.7), y, Inches(2.5), Inches(0.85),
        text=price, font_size=13, bold=True, color=col,
        bg_color=RGBColor(0x04, 0x10, 0x20), border_color=RGBColor(0x00, 0x33, 0x55),
        font_name="Courier New")
box(s, Inches(0.5), Inches(6.5), Inches(12.8), Inches(0.65),
    text="ROI: ₹5L/month cost vs ₹3,000Cr asset exposure = 600x ROI on a single avoided G5 event",
    font_size=13, color=GREEN,
    bg_color=RGBColor(0x01, 0x14, 0x0a), border_color=RGBColor(0x00, 0x66, 0x33))

# ── SLIDE 11: MOAT ────────────────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 11)
label(s, "COMPETITIVE MOAT")
h2(s, "ISRO maps satellites. KAVACH maps India's last mile.", top=Inches(1.1))
box(s, Inches(0.5), Inches(2.3), Inches(5.9), Inches(0.4),
    text="EXISTING SYSTEMS", font_size=9, color=MUTED, font_name="Courier New")
for i, txt in enumerate([
    "ISRO: satellite health — not grids, not farmers",
    "NOAA SWPC: English, internet, US-centric",
    "SpaceWeatherLive: no India mapping",
    "None automate Hindi calls to feature phones",
]):
    box(s, Inches(0.5), Inches(2.8+i*0.72), Inches(0.3), Inches(0.6), text="✗", font_size=14, color=RED)
    box(s, Inches(0.9), Inches(2.8+i*0.72), Inches(5.2), Inches(0.6), text=txt, font_size=13, color=MUTED)
box(s, Inches(6.8), Inches(2.3), Inches(6.2), Inches(0.4),
    text="KAVACH MOAT", font_size=9, color=ACCENT, font_name="Courier New")
for i, txt in enumerate([
    "28 DISCOM registry — real utilities, real lat/lng",
    "Hindi voice on feature phones — no app, no internet",
    "India-first geomagnetic exposure model",
    "Fully autonomous loop — NASA → call, no human",
]):
    box(s, Inches(6.8), Inches(2.8+i*0.72), Inches(0.3), Inches(0.6), text="✓", font_size=14, color=GREEN)
    box(s, Inches(7.2), Inches(2.8+i*0.72), Inches(5.7), Inches(0.6), text=txt, font_size=13, color=WHITE)

# ── SLIDE 12: ROADMAP ─────────────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 12)
label(s, "ROUND 2 ROADMAP — DELHI → TOKYO")
h2(s, "Coming next.", top=Inches(1.1))
# Flagship
box(s, Inches(0.5), Inches(2.2), Inches(12.3), Inches(1.2),
    text="🌐  FLAGSHIP: Multi-Language Expansion\nHindi base + Tamil, Telugu, Marathi, Bengali, Punjabi, Gujarati, Kannada by DISCOM zone. Auto-detected by pincode.",
    font_size=13, color=GREEN,
    bg_color=RGBColor(0x01, 0x14, 0x0a), border_color=RGBColor(0x00, 0x88, 0x44))
features = [
    ("🛰️", "ISRO VEDAS Integration",       "India-specific GPS accuracy forecasting no foreign tool provides"),
    ("💬", "WhatsApp + SMS Fallback",        "When call fails — WhatsApp delivers in their language. Zero missed alerts."),
    ("⚡", "Transformer Damage Model",       "Per-substation failure probability — DISCOMs get a ranked isolation list"),
    ("🔭", "CME Transit Modeling",           "4–18 hour precise countdown vs 30-minute reactive alert"),
]
for i, (icon, title, desc) in enumerate(features):
    col = 0 if i < 2 else 1
    row = i % 2
    x = Inches(0.5 + col * 6.45)
    y = Inches(3.6 + row * 1.3)
    box(s, x, y, Inches(6.1), Inches(1.1),
        bg_color=RGBColor(0x04, 0x10, 0x20), border_color=RGBColor(0x00, 0x33, 0x55))
    box(s, x+Inches(0.1), y+Inches(0.05), Inches(0.45), Inches(0.5), text=icon, font_size=16)
    box(s, x+Inches(0.6), y+Inches(0.05), Inches(5.3), Inches(0.42),
        text=title, font_size=12, bold=True, color=ACCENT)
    box(s, x+Inches(0.6), y+Inches(0.48), Inches(5.3), Inches(0.55),
        text=desc, font_size=11, color=MUTED)

# ── SLIDE 13: VISION ──────────────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 13)
label(s, "3-YEAR VISION")
h2(s, "KAVACH becomes the layer between space and 1.4 billion Indians.", top=Inches(1.1))
box(s, Inches(0.6), Inches(2.2), Inches(12), Inches(0.5),
    text="India's missing space weather authority — not a product, infrastructure.",
    font_size=14, color=MUTED, italic=True)
years = [("YEAR 1 — DELHI", "₹3Cr",   "5 DISCOMs · Hindi",          ACCENT),
         ("YEAR 2 — EXPAND", "₹47Cr", "28 DISCOMs · 8 languages",   YELLOW),
         ("YEAR 3 — TOKYO",  "₹200Cr","Telecom · Insurance · SAARC", GREEN)]
for i, (yr, amt, sub, col) in enumerate(years):
    x = Inches(0.5 + i * 4.27)
    box(s, x, Inches(3.0), Inches(4.0), Inches(0.45),
        text=yr, font_size=9, color=MUTED, font_name="Courier New",
        bg_color=RGBColor(0x04, 0x10, 0x20), border_color=RGBColor(0x00, 0x33, 0x55))
    box(s, x, Inches(3.45), Inches(4.0), Inches(1.0),
        text=amt, font_size=40, bold=True, color=col,
        bg_color=RGBColor(0x04, 0x10, 0x20), font_name="Courier New")
    box(s, x, Inches(4.45), Inches(4.0), Inches(0.55),
        text=sub, font_size=12, color=MUTED,
        bg_color=RGBColor(0x04, 0x10, 0x20), border_color=RGBColor(0x00, 0x33, 0x55))
box(s, Inches(0.4), Inches(5.4), Inches(0.08), Inches(1.5), bg_color=ACCENT)
box(s, Inches(0.7), Inches(5.4), Inches(12), Inches(1.5),
    text='"The next G5 storm is not a matter of if — it\'s when. KAVACH will be ready."',
    font_size=17, color=MUTED, italic=True)

# ── SLIDE 14: THANK YOU ───────────────────────────────────────────
s = add_slide(); bg(s); slide_num(s, 14)
box(s, Inches(0.6), Inches(0.5), Inches(5), Inches(0.4),
    text="THANK YOU", font_size=9, color=ACCENT, font_name="Courier New")
h1(s, "KAVACH", top=Inches(1.1), size=80)
box(s, Inches(0.6), Inches(2.9), Inches(11), Inches(0.6),
    text='"It called the farmer before the lights went out."',
    font_size=20, color=MUTED, italic=True)
links = [
    ("LIVE DEMO",   "frontend-rust-xi-79.vercel.app"),
    ("GITHUB",      "github.com/VibhorJain1974/kavach-faraway-2026"),
    ("CONTACT",     "jvibhor202@gmail.com"),
    ("TEAM",        "404_SHINOBI  ·  FAR AWAY 2026"),
]
for i, (lbl, val) in enumerate(links):
    x = Inches(0.5 + (i % 2) * 6.5)
    y = Inches(4.0 + (i // 2) * 1.1)
    box(s, x, y, Inches(6.1), Inches(0.38),
        text=lbl, font_size=9, color=MUTED, font_name="Courier New",
        bg_color=RGBColor(0x04, 0x10, 0x20), border_color=RGBColor(0x00, 0x33, 0x55))
    box(s, x, y+Inches(0.38), Inches(6.1), Inches(0.55),
        text=val, font_size=12, color=ACCENT,
        bg_color=RGBColor(0x04, 0x10, 0x20), border_color=RGBColor(0x00, 0x44, 0x66))

out = r"E:\FARAWAY\docs\KAVACH_FARAWAY2026.pptx"
prs.save(out)
print(f"Saved: {out}  ({prs.slides.__len__()} slides)")
