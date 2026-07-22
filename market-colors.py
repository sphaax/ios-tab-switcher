#!/usr/bin/env python3
"""Colored variant of market-screenshots.py (1280x800 Web Store images).

Same layout as market-screenshots.py — headline + subtitle above a rounded,
softly-shadowed screenshot panel — but each image sits on its own diagonal
color gradient instead of the shared dark one. One accent per screenshot, so
the five listing images read as a set without looking repetitive.

Usage:
    pip install Pillow
    python market-colors.py            # store-screenshots/raw -> store-screenshots/marketing-colors
    python market-colors.py IN OUT

Input is the *raw* captures, not store-screenshots/out: the out/ images are
already letterboxed to 1280x800, and re-fitting them into the panel would
shrink the UI a second time. The raw filenames also carry the keyword used to
pick the caption and the accent.

Captions and accents are matched by a keyword in the filename (grid, dnd,
duplicates, search, private); otherwise they are applied in filename order.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1280, 800


def _find_font(candidates):
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


# Prefer Segoe UI (Windows); fall back to Arial or DejaVu (Linux) so the script
# also runs in a non-Windows environment.
BOLD = _find_font([
    'C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
])
REG = _find_font([
    'C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
])


def font(path, size):
    return ImageFont.truetype(path, size) if path else ImageFont.load_default()


# (keyword, headline, subtitle, dark corner, accent corner).
# Accents: blue = the hero, purple = grouping, rose = cleanup, teal = search,
# slate = privacy (deliberately the most discreet of the five).
SLIDES = [
    ('grid', 'All your tabs, at a glance.', 'A clean grid of live previews.',
     (17, 34, 88), (59, 130, 246)),
    ('dnd', 'Drop one tab onto another.', 'That is a tab group, instantly.',
     (44, 16, 96), (147, 51, 234)),
    ('duplicates', 'Find every duplicate tab.', 'Close the extras in one click.',
     (74, 8, 38), (236, 72, 100)),
    ('search', 'Find any tab, instantly.', 'Just start typing.',
     (4, 44, 44), (20, 184, 166)),
    ('private', 'A private space, kept private.', 'Incognito previews never touch disk.',
     (13, 20, 36), (66, 80, 102)),
]
EXTS = {'.png', '.jpg', '.jpeg', '.webp'}


def diagonal_grad(size, dark, accent):
    """Dégradé diagonal : coin haut-gauche sombre, coin bas-droit accentué."""
    w, h = size
    img = Image.new('RGB', size)
    px = img.load()
    for y in range(h):
        ty = y / (h - 1)
        for x in range(w):
            t = (x / (w - 1) + ty) / 2
            px[x, y] = tuple(round(dark[i] + (accent[i] - dark[i]) * t) for i in range(3))
    return img


def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return m


def center_text(draw, cx, y, text, font, fill):
    l, t, r, b = draw.textbbox((0, 0), text, font=font)
    draw.text((cx - (r - l) / 2, y), text, font=font, fill=fill)
    return b - t


def slide_for(name, index):
    key = os.path.splitext(name)[0].lower()
    for slide in SLIDES:
        if slide[0] in key:
            return slide
    return SLIDES[index] if index < len(SLIDES) else SLIDES[-1]


def compose(src, dst, headline, subtitle, dark, accent):
    canvas = diagonal_grad((W, H), dark, accent).convert('RGBA')
    draw = ImageDraw.Draw(canvas)

    head_font = font(BOLD, 46)
    sub_font = font(REG, 23)
    center_text(draw, W / 2, 64, headline, head_font, (255, 255, 255))
    center_text(draw, W / 2, 126, subtitle, sub_font, (235, 235, 240))

    # scale the screenshot to fit the panel area below the text
    shot = Image.open(src).convert('RGB')
    area_top, area_bottom, side = 196, 748, 110
    max_w, max_h = W - side * 2, area_bottom - area_top
    scale = min(max_w / shot.width, max_h / shot.height)
    sw, sh = round(shot.width * scale), round(shot.height * scale)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    px = (W - sw) // 2
    py = area_top + (max_h - sh) // 2

    radius = 16
    shot.putalpha(rounded_mask((sw, sh), radius))

    # soft drop shadow — plus dense que la version sombre, le fond est clair
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(sd).rounded_rectangle([0, 0, sw - 1, sh - 1], radius, fill=165)
    shadow.paste((0, 0, 0), (px, py + 12), sd)
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    canvas = Image.alpha_composite(canvas, shadow)

    # subtle border then the screenshot
    border = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle(
        [px - 1, py - 1, px + sw, py + sh], radius + 1, outline=(255, 255, 255, 46), width=2)
    canvas.paste(shot, (px, py), shot)
    canvas = Image.alpha_composite(canvas, border)

    canvas.convert('RGB').save(dst, 'PNG')


def main():
    root = os.path.dirname(os.path.abspath(__file__))
    in_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'store-screenshots', 'raw')
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, 'store-screenshots', 'marketing-colors')
    if not os.path.isdir(in_dir):
        print(f'Input folder not found: {in_dir}')
        return
    files = sorted(f for f in os.listdir(in_dir) if os.path.splitext(f)[1].lower() in EXTS)
    if not files:
        print(f'No images in {in_dir}')
        return
    os.makedirs(out_dir, exist_ok=True)
    for i, name in enumerate(files):
        _, headline, subtitle, dark, accent = slide_for(name, i)
        dst = os.path.join(out_dir, f'marketing-{i + 1:02d}.png')
        compose(os.path.join(in_dir, name), dst, headline, subtitle, dark, accent)
        print(f'{name}  ->  {os.path.relpath(dst, root)}  |  "{headline}"')
    print(f'\n{len(files)} colored marketing image(s) ready in {out_dir}')


if __name__ == '__main__':
    main()
