#!/usr/bin/env python3
"""Generate Play Store phone screenshots that mirror the Chesster app UI."""

W, H = 1080, 2340
BG = "#05060f"
ELEM = "#141834"
SEL = "#1e2450"
TEXT = "#e8ecff"
TEXT2 = "#9aa3d0"
AQUA = "#22d3ee"
ON_PRIMARY = "#1A2842"
# ocean board theme
LIGHT_SQ = "#DEE7F0"
DARK_SQ = "#6E92B8"
LASTMOVE = "rgba(255,214,92,0.38)"
WHITE_PC = "#F4F8FF"
BLACK_PC = "#10152E"

FONT = "'Helvetica Neue',Arial,sans-serif"

# device screen frame
SX, SY, SW, SH, SR = 90, 470, 900, 1740, 60

GLYPH = {"k": "♚", "q": "♛", "r": "♜",
         "b": "♝", "n": "♞", "p": "♟"}

# a plausible middlegame position, rank 8 (top) -> rank 1 (bottom)
POSITION = [
    "r.bqk..r",
    "pp..npbp",
    "..n..np.",
    "..pp....",
    "...P.B..",
    "..N.PN..",
    "PPPQ.PPP",
    "R...KB.R",
]


def header():
    return (
        f'<rect x="{SX}" y="{SY}" width="{SW}" height="86" fill="{BG}"/>'
        # status bar
        f'<text x="{SX+40}" y="{SY+52}" font-family="{FONT}" font-size="26" '
        f'font-weight="600" fill="{TEXT}">9:41</text>'
        f'<g fill="{TEXT}"><rect x="{SX+SW-150}" y="{SY+34}" width="34" height="18" rx="3"/>'
        f'<rect x="{SX+SW-100}" y="{SY+30}" width="40" height="22" rx="4"/>'
        f'<circle cx="{SX+SW-40}" cy="{SY+43}" r="11"/></g>'
    )


def title_bar(t):
    y = SY + 86
    hx, hy = SX + 44, y + 34
    return (
        f'<rect x="{SX}" y="{y}" width="{SW}" height="96" fill="{BG}"/>'
        # hamburger (drawer toggle)
        f'<g stroke="{TEXT}" stroke-width="5" stroke-linecap="round">'
        f'<line x1="{hx}" y1="{hy}" x2="{hx+40}" y2="{hy}"/>'
        f'<line x1="{hx}" y1="{hy+14}" x2="{hx+40}" y2="{hy+14}"/>'
        f'<line x1="{hx}" y1="{hy+28}" x2="{hx+40}" y2="{hy+28}"/></g>'
        f'<text x="{SX+SW/2}" y="{y+62}" text-anchor="middle" font-family="{FONT}" '
        f'font-size="38" font-weight="700" fill="{TEXT}">{t}</text>'
        f'<line x1="{SX}" y1="{y+96}" x2="{SX+SW}" y2="{y+96}" stroke="{ELEM}" stroke-width="2"/>'
    )


def icon(kind, cx, cy, col):
    """Simple line icons approximating the app's Ionicons."""
    if kind == "play":
        return (f'<polygon points="{cx-14},{cy-18} {cx-14},{cy+18} {cx+20},{cy}" '
                f'fill="none" stroke="{col}" stroke-width="4" stroke-linejoin="round"/>')
    if kind == "history":
        return (f'<circle cx="{cx}" cy="{cy}" r="20" fill="none" stroke="{col}" stroke-width="4"/>'
                f'<line x1="{cx}" y1="{cy}" x2="{cx}" y2="{cy-12}" stroke="{col}" stroke-width="4" stroke-linecap="round"/>'
                f'<line x1="{cx}" y1="{cy}" x2="{cx+11}" y2="{cy+5}" stroke="{col}" stroke-width="4" stroke-linecap="round"/>')
    if kind == "profile":
        return (f'<circle cx="{cx}" cy="{cy-9}" r="11" fill="none" stroke="{col}" stroke-width="4"/>'
                f'<path d="M {cx-19} {cy+22} a 19 16 0 0 1 38 0" fill="none" stroke="{col}" stroke-width="4"/>')
    if kind == "terms":
        return (f'<rect x="{cx-16}" y="{cy-20}" width="32" height="40" rx="4" fill="none" stroke="{col}" stroke-width="4"/>'
                f'<line x1="{cx-8}" y1="{cy-8}" x2="{cx+8}" y2="{cy-8}" stroke="{col}" stroke-width="3"/>'
                f'<line x1="{cx-8}" y1="{cy+2}" x2="{cx+8}" y2="{cy+2}" stroke="{col}" stroke-width="3"/>')
    return ""


def board(cx, cy, size):
    cell = size / 8
    out = []
    for r in range(8):
        for c in range(8):
            x = cx + c * cell
            y = cy + r * cell
            fill = LIGHT_SQ if (r + c) % 2 == 0 else DARK_SQ
            out.append(f'<rect x="{x}" y="{y}" width="{cell+0.5}" height="{cell+0.5}" fill="{fill}"/>')
    # last-move highlight (e2-e4-ish)
    out.append(f'<rect x="{cx+4*cell}" y="{cy+4*cell}" width="{cell}" height="{cell}" fill="rgba(255,214,92,0.40)"/>')
    out.append(f'<rect x="{cx+3*cell}" y="{cy+3*cell}" width="{cell}" height="{cell}" fill="rgba(255,214,92,0.30)"/>')
    for r, row in enumerate(POSITION):
        for c, ch in enumerate(row):
            if ch == ".":
                continue
            glyph = GLYPH[ch.lower()]
            col = WHITE_PC if ch.isupper() else BLACK_PC
            x = cx + c * cell + cell / 2
            y = cy + r * cell + cell * 0.74
            stroke = "rgba(0,0,0,0.35)" if ch.isupper() else "rgba(255,255,255,0.18)"
            out.append(f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{cell*0.82:.0f}" '
                       f'fill="{col}" stroke="{stroke}" stroke-width="1.5" '
                       f'font-family="\'Arial Unicode MS\',\'Apple Symbols\',sans-serif">{glyph}</text>')
    # border
    out.append(f'<rect x="{cx}" y="{cy}" width="{size}" height="{size}" fill="none" '
               f'stroke="{ELEM}" stroke-width="4" rx="8"/>')
    return "".join(out)


def caption(line1, line2=None):
    out = [f'<text x="{W/2}" y="200" text-anchor="middle" font-family="{FONT}" '
           f'font-size="76" font-weight="800" letter-spacing="-1" fill="url(#word)">{line1}</text>']
    if line2:
        out.append(f'<text x="{W/2}" y="300" text-anchor="middle" font-family="{FONT}" '
                   f'font-size="76" font-weight="800" letter-spacing="-1" fill="{TEXT}">{line2}</text>')
    return "".join(out)


def frame_shell():
    return (
        f'<rect x="{SX}" y="{SY}" width="{SW}" height="{SH}" rx="{SR}" fill="{BG}" '
        f'stroke="{ELEM}" stroke-width="3"/>'
    )


def defs():
    return (
        '<defs>'
        '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#1b2a4a"/><stop offset="0.5" stop-color="#0b1024"/>'
        '<stop offset="1" stop-color="#05060f"/></linearGradient>'
        '<radialGradient id="glow" cx="0.5" cy="0.18" r="0.6">'
        f'<stop offset="0" stop-color="{AQUA}" stop-opacity="0.25"/>'
        f'<stop offset="1" stop-color="{AQUA}" stop-opacity="0"/></radialGradient>'
        '<linearGradient id="word" x1="0" y1="0" x2="1" y2="0">'
        '<stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#7c3aed"/>'
        '</linearGradient>'
        '<linearGradient id="pawnG" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#22d3ee"/>'
        '</linearGradient>'
        '</defs>'
    )


def stars():
    pts = [(120, 340, 2), (300, 240, 1.4), (820, 300, 1.8), (960, 200, 1.3),
           (60, 180, 1.5), (700, 150, 1.2), (500, 120, 1.6), (200, 400, 1.2)]
    return "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" opacity="0.7"/>' for x, y, r in pts)


def wrap(body):
    return (f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">'
            f'{defs()}<rect width="{W}" height="{H}" fill="url(#bg)"/>'
            f'<rect width="{W}" height="{H}" fill="url(#glow)"/>{stars()}{body}</svg>')


def screen_play():
    b = SW - 80
    body = [frame_shell(), header(), title_bar("Chesster")]
    body.append(board(SX + 40, SY + 260, b))
    # difficulty pill + turn
    py = SY + 260 + b + 60
    body.append(f'<rect x="{SX+40}" y="{py}" width="360" height="76" rx="38" fill="{SEL}"/>')
    body.append(f'<circle cx="{SX+90}" cy="{py+38}" r="18" fill="{AQUA}"/>')
    body.append(f'<text x="{SX+128}" y="{py+50}" font-family="{FONT}" font-size="30" '
                f'font-weight="600" fill="{TEXT}">Level 6 · Intermediate</text>')
    body.append(f'<text x="{SX+SW-40}" y="{py+50}" text-anchor="end" font-family="{FONT}" '
                f'font-size="30" font-weight="600" fill="{TEXT2}">White to move</text>')
    # buttons
    by = py + 120
    body.append(f'<rect x="{SX+40}" y="{by}" width="400" height="92" rx="46" fill="{AQUA}"/>')
    body.append(f'<text x="{SX+240}" y="{by+60}" text-anchor="middle" font-family="{FONT}" '
                f'font-size="34" font-weight="700" fill="{ON_PRIMARY}">New game</text>')
    body.append(f'<rect x="{SX+460}" y="{by}" width="400" height="92" rx="46" fill="none" stroke="{SEL}" stroke-width="3"/>')
    body.append(f'<text x="{SX+660}" y="{by+60}" text-anchor="middle" font-family="{FONT}" '
                f'font-size="34" font-weight="600" fill="{TEXT}">Undo</text>')
    return wrap(caption("Outsmart", "the AI") + "".join(body))


def screen_drawer():
    """The sidebar (Drawer) open over a dimmed board, mirroring drawer-content.tsx."""
    b = SW - 80
    body = [frame_shell(), header(), title_bar("Chesster")]
    # dimmed board behind
    body.append(board(SX + 40, SY + 260, b))
    body.append(f'<rect x="{SX}" y="{SY+86}" width="{SW}" height="{SH-86}" fill="#05060f" opacity="0.62"/>')
    # drawer panel from left, ~74% width
    dw = int(SW * 0.74)
    dx, dy = SX, SY
    dh = SH
    body.append(f'<clipPath id="dclip"><rect x="{SX}" y="{SY}" width="{SW}" height="{SH}" rx="{SR}"/></clipPath>')
    body.append(f'<g clip-path="url(#dclip)">')
    body.append(f'<rect x="{dx}" y="{dy}" width="{dw}" height="{dh}" fill="#0a0e22"/>')
    body.append(f'<line x1="{dx+dw}" y1="{dy}" x2="{dx+dw}" y2="{dy+dh}" stroke="{ELEM}" stroke-width="2"/>')
    # header: avatar + name + email
    hy = dy + 130
    body.append(f'<circle cx="{dx+90}" cy="{hy}" r="48" fill="{AQUA}"/>')
    body.append(f'<text x="{dx+90}" y="{hy+16}" text-anchor="middle" font-family="{FONT}" '
                f'font-size="44" font-weight="800" fill="{ON_PRIMARY}">D</text>')
    body.append(f'<text x="{dx+160}" y="{hy-6}" font-family="{FONT}" font-size="36" '
                f'font-weight="700" fill="{TEXT}">David V.</text>')
    body.append(f'<text x="{dx+160}" y="{hy+34}" font-family="{FONT}" font-size="26" '
                f'fill="{TEXT2}">david@email.com</text>')
    # items
    items = [("play", "Play", True), ("history", "History", False),
             ("profile", "Profile", False), ("terms", "Terms &amp; Conditions", False)]
    iy = hy + 110
    for i, (ic, label, active) in enumerate(items):
        ry = iy + i * 108
        if active:
            body.append(f'<rect x="{dx+24}" y="{ry-4}" width="{dw-48}" height="84" rx="24" fill="{SEL}"/>')
        col = TEXT
        body.append(icon(ic, dx + 74, ry + 38, col))
        body.append(f'<text x="{dx+130}" y="{ry+52}" font-family="{FONT}" font-size="34" '
                    f'font-weight="{"700" if active else "500"}" fill="{col}">{label}</text>')
    # divider + auth
    ay = iy + len(items) * 108 + 30
    body.append(f'<line x1="{dx+24}" y1="{ay}" x2="{dx+dw-24}" y2="{ay}" stroke="rgba(127,127,127,0.3)" stroke-width="2"/>')
    body.append(icon("profile", dx + 74, ay + 68, TEXT))
    body.append(f'<text x="{dx+130}" y="{ay+82}" font-family="{FONT}" font-size="34" '
                f'font-weight="500" fill="{TEXT}">Sign in</text>')
    body.append(f'<rect x="{dx+24}" y="{ay+120}" width="{dw-48}" height="84" rx="24" fill="{AQUA}"/>')
    body.append(f'<text x="{dx+(dw)/2}" y="{ay+172}" text-anchor="middle" font-family="{FONT}" '
                f'font-size="32" font-weight="700" fill="{ON_PRIMARY}">Create account</text>')
    body.append('</g>')
    return wrap(caption("One swipe", "to everything") + "".join(body))


def screen_history():
    body = [frame_shell(), header(), title_bar("History")]
    rows = [("Win", "#2E9E5B", "Level 6", "18 moves"),
            ("Loss", "#E24242", "Level 9", "31 moves"),
            ("Draw", "#8894A3", "Level 5", "44 moves"),
            ("Win", "#2E9E5B", "Level 7", "26 moves"),
            ("Win", "#2E9E5B", "Level 4", "12 moves"),
            ("Loss", "#E24242", "Level 8", "37 moves"),
            ("Playing", "#208AEF", "Level 6", "resume")]
    y = SY + 220
    for i, (out_t, col, lvl, meta) in enumerate(rows):
        ry = y + i * 176
        body.append(f'<rect x="{SX+50}" y="{ry}" width="{SW-100}" height="150" rx="28" fill="{ELEM}"/>')
        body.append(f'<rect x="{SX+80}" y="{ry+45}" width="150" height="60" rx="30" fill="{col}"/>')
        body.append(f'<text x="{SX+155}" y="{ry+86}" text-anchor="middle" font-family="{FONT}" '
                    f'font-size="30" font-weight="700" fill="#fff">{out_t}</text>')
        body.append(f'<text x="{SX+260}" y="{ry+72}" font-family="{FONT}" font-size="36" '
                    f'font-weight="600" fill="{TEXT}">{lvl}</text>')
        body.append(f'<text x="{SX+260}" y="{ry+114}" font-family="{FONT}" font-size="28" '
                    f'fill="{TEXT2}">{meta}</text>')
        body.append(f'<text x="{SX+SW-90}" y="{ry+92}" text-anchor="end" font-family="{FONT}" '
                    f'font-size="40" fill="{TEXT2}">›</text>')
    return wrap(caption("Review", "every game") + "".join(body))


def screen_profile():
    body = [frame_shell(), header(), title_bar("Profile")]
    cx = SX + SW / 2
    y = SY + 320
    body.append(f'<circle cx="{cx}" cy="{y}" r="120" fill="url(#pawnG)"/>')
    # pawn silhouette inside avatar
    body.append(f'<g transform="translate({cx-120},{y-120}) scale(0.234)" fill="{ON_PRIMARY}">'
                '<circle cx="512" cy="322" r="128"/><ellipse cx="512" cy="452" rx="112" ry="34"/>'
                '<path d="M 449 452 C 430 545, 392 640, 360 724 L 664 724 C 632 640, 594 545, 575 452 Z"/>'
                '<rect x="338" y="712" width="348" height="150" rx="34"/></g>')
    body.append(f'<text x="{cx}" y="{y+200}" text-anchor="middle" font-family="{FONT}" '
                f'font-size="48" font-weight="800" fill="{TEXT}">David V.</text>')
    body.append(f'<text x="{cx}" y="{y+252}" text-anchor="middle" font-family="{FONT}" '
                f'font-size="30" fill="{TEXT2}">Signed in with Google</text>')
    # stats row
    sy = y + 340
    stats = [("128", "Games"), ("74", "Wins"), ("58%", "Win rate")]
    cwid = (SW - 100) / 3
    for i, (v, lab) in enumerate(stats):
        scx = SX + 50 + cwid * i + cwid / 2
        body.append(f'<rect x="{SX+50+cwid*i+15}" y="{sy}" width="{cwid-30}" height="180" rx="28" fill="{ELEM}"/>')
        body.append(f'<text x="{scx}" y="{sy+90}" text-anchor="middle" font-family="{FONT}" '
                    f'font-size="56" font-weight="800" fill="{AQUA}">{v}</text>')
        body.append(f'<text x="{scx}" y="{sy+140}" text-anchor="middle" font-family="{FONT}" '
                    f'font-size="28" fill="{TEXT2}">{lab}</text>')
    # button
    by = sy + 260
    body.append(f'<rect x="{SX+50}" y="{by}" width="{SW-100}" height="96" rx="48" fill="{AQUA}"/>')
    body.append(f'<text x="{cx}" y="{by+62}" text-anchor="middle" font-family="{FONT}" '
                f'font-size="34" font-weight="700" fill="{ON_PRIMARY}">Edit profile</text>')
    return wrap(caption("Sync across", "devices") + "".join(body))


SCREENS = {
    "01-play": screen_play,
    "02-sidebar": screen_drawer,
    "03-history": screen_history,
    "04-profile": screen_profile,
}

if __name__ == "__main__":
    import os
    d = os.path.dirname(os.path.abspath(__file__))
    for name, fn in SCREENS.items():
        p = os.path.join(d, f"screenshot-{name}.svg")
        with open(p, "w") as f:
            f.write(fn())
        print("wrote", p)
