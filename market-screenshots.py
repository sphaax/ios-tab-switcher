#!/usr/bin/env python3
"""Turn raw switcher screenshots into iOS-style marketing images (1280x800).

Each input screenshot is placed as a rounded, softly-shadowed panel on a dark
gradient, with an Apple-style headline + subtitle above it. Output stays exactly
1280x800 for the Chrome Web Store.

Usage:
    pip install Pillow
    python market-screenshots.py            # store-screenshots/out -> store-screenshots/marketing
    python market-screenshots.py IN OUT

Captions are matched by a keyword in the filename (grid, search, groups, private,
badges); otherwise they are applied in filename order.
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

# (keyword, headline, subtitle) — iOS-style: short, confident.
CAPTIONS = [
    ('grid', 'All your tabs, at a glance.', 'A clean grid of live previews.'),
    ('search', 'Find any tab, instantly.', 'Just start typing.'),
    ('groups', 'Organize with tab groups.', 'See and edit them in color.'),
    ('private', 'A private space, kept private.', 'Incognito previews never touch disk.'),
    ('badges', "Know what's making noise.", 'Mute any tab in one click.'),
]
EXTS = {'.png', '.jpg', '.jpeg', '.webp'}


def vgrad(size, top, bottom):
    img = Image.new('RGB', size)
    px = img.load()
    for y in range(size[1]):
        t = y / (size[1] - 1)
        c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(size[0]):
            px[x, y] = c
    return img


def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return m


def center_text(draw, cx, y, text, font, fill):
    l, t, r, b = draw.textbbox((0, 0), text, font=font)
    draw.text((cx - (r - l) / 2, y), text, font=font, fill=fill)
    return b - t


def caption_for(name, index):
    key = os.path.splitext(name)[0].lower()
    for kw, h, s in CAPTIONS:
        if kw in key:
            return h, s
    return (CAPTIONS[index][1], CAPTIONS[index][2]) if index < len(CAPTIONS) else ('', '')


def compose(src, dst, headline, subtitle):
    canvas = vgrad((W, H), (26, 26, 30), (7, 7, 9)).convert('RGBA')
    draw = ImageDraw.Draw(canvas)

    head_font = font(BOLD, 46)
    sub_font = font(REG, 23)
    center_text(draw, W / 2, 64, headline, head_font, (245, 245, 247))
    center_text(draw, W / 2, 126, subtitle, sub_font, (152, 152, 160))

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

    # soft drop shadow
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(sd).rounded_rectangle([0, 0, sw - 1, sh - 1], radius, fill=140)
    shadow.paste((0, 0, 0), (px, py + 10), sd)
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    canvas = Image.alpha_composite(canvas, shadow)

    # subtle border then the screenshot
    border = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle(
        [px - 1, py - 1, px + sw, py + sh], radius + 1, outline=(255, 255, 255, 26), width=2)
    canvas.paste(shot, (px, py), shot)
    canvas = Image.alpha_composite(canvas, border)

    canvas.convert('RGB').save(dst, 'PNG')


def main():
    root = os.path.dirname(os.path.abspath(__file__))
    in_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'store-screenshots', 'out')
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, 'store-screenshots', 'marketing')
    if not os.path.isdir(in_dir):
        print(f'Input folder not found: {in_dir}')
        return
    files = sorted(f for f in os.listdir(in_dir) if os.path.splitext(f)[1].lower() in EXTS)
    if not files:
        print(f'No images in {in_dir}')
        return
    os.makedirs(out_dir, exist_ok=True)
    for i, name in enumerate(files):
        headline, subtitle = caption_for(name, i)
        dst = os.path.join(out_dir, f'marketing-{i + 1:02d}.png')
        compose(os.path.join(in_dir, name), dst, headline, subtitle)
        print(f'{name}  ->  {os.path.relpath(dst, root)}  |  "{headline}"')
    print(f'\n{len(files)} marketing image(s) ready in {out_dir}')


if __name__ == '__main__':
    main()
