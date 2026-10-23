"""botfx — design tokens (source de vérité Python). Miroir de BOTFX_DESIGN_SYSTEM.md §3."""
import math

BOTFX = {
    # identité
    "name": "botfx",
    "owner": "François Dasylva",
    "tagline": "Vos opérations, en pilote automatique.",
    "site": "botfx.fr",
    "email": "contact@botfx.fr",
    "linkedin": "linkedin.com/in/francois-dasylva",
    # noir / argent / blanc
    "black": "#050506",
    "black_2": "#0B0B0D",
    "black_card": "#111114",
    "white": "#FFFFFF",
    "fg": "#F5F5F6",
    "silver_1": "#FFFFFF",
    "silver_2": "#D9DCE1",
    "silver_3": "#8B9098",
    "silver_4": "#C9CCD1",
    "muted": "#A3A7AE",
    "dim": "#878B93",
    # pages intérieures claires
    "ink": "#0A0A0B",
    "ink_2": "#3F3F46",
    "ink_3": "#71717A",
    "paper": "#FFFFFF",
    "paper_2": "#F6F6F7",
    "rule": "#E4E4E7",
    # statuts (sobres)
    "positive": "#1F9D63",
    "warning": "#B7791F",
    "negative": "#C8413A",
}

GRADE_COLORS = {"A": "#1F9D63", "B": "#5E9E4A", "C": "#B7951F", "D": "#C9772B", "E": "#C8413A", "F": "#962020"}


def score_to_grade(score: float) -> str:
    for g, floor in (("A", 90), ("B", 75), ("C", 60), ("D", 40), ("E", 20)):
        if score >= floor:
            return g
    return "F"


def sphere_svg(size: int = 520, n: int = 1400, rot_y: float = 0.55, rot_x: float = 0.35, ring: bool = True) -> str:
    """Sphère de points argentés (signature visuelle botfx), en SVG statique pour WeasyPrint."""
    golden = math.pi * (3 - math.sqrt(5))
    r, c = size * 0.36, size / 2
    out = []
    for i in range(n):
        y = 1 - (i / (n - 1)) * 2
        rad = math.sqrt(1 - y * y)
        th = golden * i
        x, z = math.cos(th) * rad, math.sin(th) * rad
        x1, z1 = x * math.cos(rot_y) - z * math.sin(rot_y), x * math.sin(rot_y) + z * math.cos(rot_y)
        y1, z2 = y * math.cos(rot_x) - z1 * math.sin(rot_x), y * math.sin(rot_x) + z1 * math.cos(rot_x)
        p = 2.6 / (2.6 + z2)
        d = (1 - z2) / 2
        s = (0.7 + d * 1.6) * p
        out.append(f'<rect x="{c + x1 * r * p:.1f}" y="{c + y1 * r * p:.1f}" width="{s:.2f}" height="{s:.2f}" '
                   f'fill="#E6E8EC" fill-opacity="{0.1 + d * 0.8:.2f}"/>')
    ring_svg = (f'<ellipse cx="{c}" cy="{c}" rx="{r * 1.5:.1f}" ry="{r * 0.42:.1f}" transform="rotate(-18 {c} {c})" '
                f'fill="none" stroke="#FFFFFF" stroke-opacity=".14" stroke-width="1"/>'
                f'<circle cx="{c + r * 1.38:.1f}" cy="{c - r * 0.52:.1f}" r="2.6" fill="#FFFFFF"/>') if ring else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">{"".join(out)}{ring_svg}</svg>'
