"""Usage: pip install pillow && python3 store/generate_art.py

Generates Traffic Rush app icon, Android adaptive layers and Play feature graphic.
Everything is drawn at 4x and downsampled with LANCZOS for anti-aliasing."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # traffic-rush/
ICON_DIR = os.path.join(ROOT, "Assets/Art/Icon")
STORE_DIR = os.path.join(ROOT, "store")
SS = 4  # supersampling

SKY_TOP = (255, 196, 64)
SKY_MID = (255, 110, 40)
SKY_BOT = (214, 36, 64)
GROUND = (70, 18, 52)
ASPHALT_FAR = (70, 62, 82)
ASPHALT_NEAR = (38, 34, 48)
RED = (230, 30, 40)
RED_DARK = (160, 14, 28)
RED_LIGHT = (255, 92, 92)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(len(a)))


def vgradient(w, h, stops):
    """stops: list of (pos 0..1, rgb)."""
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        for i in range(len(stops) - 1):
            p0, c0 = stops[i]
            p1, c1 = stops[i + 1]
            if p0 <= t <= p1:
                c = lerp(c0, c1, (t - p0) / max(1e-6, p1 - p0))
                break
        else:
            c = stops[-1][1]
        d.line([(0, y), (w, y)], fill=c)
    return img


def draw_scene(w, h, horizon, vp_x, road_bottom_half, sun=True):
    """Background: sky, sun, ground, 3-lane road in perspective. Returns RGB image."""
    img = vgradient(w, h, [(0, SKY_TOP), (horizon / h * 0.55, SKY_MID), (horizon / h, SKY_BOT), (1, SKY_BOT)])
    d = ImageDraw.Draw(img)
    if sun:
        r = int(min(w, h) * 0.2)
        cy = horizon - int(r * 0.25)
        sun_img = vgradient(2 * r, 2 * r, [(0, (255, 244, 170)), (1, (255, 150, 60))])
        mask = Image.new("L", (2 * r, 2 * r), 0)
        md = ImageDraw.Draw(mask)
        md.ellipse([0, 0, 2 * r - 1, 2 * r - 1], fill=255)
        # retro stripes cut into the lower half of the sun
        n = 5
        for i in range(n):
            y0 = int(r * 0.62 + i * r * 0.14)
            md.rectangle([0, y0, 2 * r, y0 + int(r * 0.025 * (i + 1))], fill=0)
        img.paste(sun_img, (vp_x - r, cy - r), mask)
    # ground below horizon
    d.rectangle([0, horizon, w, h], fill=GROUND)
    # road trapezoid with vertical gradient
    top_half = max(2, int(w * 0.012))
    road = vgradient(w, h - horizon, [(0, ASPHALT_FAR), (1, ASPHALT_NEAR)])
    rmask = Image.new("L", (w, h - horizon), 0)
    ImageDraw.Draw(rmask).polygon(
        [(vp_x - top_half, 0), (vp_x + top_half, 0), (vp_x + road_bottom_half, h - horizon), (vp_x - road_bottom_half, h - horizon)],
        fill=255)
    img.paste(road, (0, horizon), rmask)

    def xat(frac, y):
        """x of a line at lateral fraction (-1..1) of the road at screen y."""
        t = (y - horizon) / (h - horizon)
        half = top_half + (road_bottom_half - top_half) * t
        return vp_x + frac * half

    # road edge lines (solid)
    for frac in (-0.93, 0.93):
        pts = []
        for y in (horizon, h):
            pts.append((xat(frac - 0.035, y), y))
        for y in (h, horizon):
            pts.append((xat(frac + 0.035, y), y))
        d.polygon(pts, fill=(255, 236, 200))
    # lane dashes (perspective: dash length grows with depth parameter)
    for frac in (-1 / 3, 1 / 3):
        z = 0.0
        # iterate in "distance" space; screen t = 1/(1+k*dist)
        k = 0.30
        dist = 0.0
        while dist < 80:
            y0 = horizon + (h - horizon) / (1 + k * dist)
            y1 = horizon + (h - horizon) / (1 + k * (dist + 1.0))
            if y0 - y1 < 1:
                break
            pts = [(xat(frac - 0.03, y0), y0), (xat(frac + 0.03, y0), y0), (xat(frac + 0.03, y1), y1), (xat(frac - 0.03, y1), y1)]
            d.polygon(pts, fill=(255, 255, 255))
            dist += 2.2
    return img


def draw_car(layer, cx, by, w):
    """Stylised red car seen from behind. cx=center x, by=bottom y (tyre contact), w=body width."""
    d = ImageDraw.Draw(layer)
    s = w
    # soft shadow
    sh = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([cx - s * 0.62, by - s * 0.07, cx + s * 0.62, by + s * 0.07], fill=(0, 0, 0, 150))
    sh = sh.filter(ImageFilter.GaussianBlur(s * 0.03))
    layer.alpha_composite(sh)
    d = ImageDraw.Draw(layer)
    # tyres
    tw, th = s * 0.17, s * 0.22
    for sx in (-1, 1):
        x0 = cx + sx * (s * 0.5 - tw * 0.55) - tw / 2
        d.rounded_rectangle([x0, by - th, x0 + tw, by], radius=s * 0.04, fill=(20, 20, 26))
    # cabin (trapezoid) behind body
    cab_bot = by - s * 0.50
    cab_top = by - s * 0.86
    d.rounded_rectangle([cx - s * 0.36, cab_top, cx + s * 0.36, cab_bot + s * 0.05], radius=s * 0.10, fill=RED_DARK)
    d.polygon([(cx - s * 0.47, cab_bot + s * 0.02), (cx - s * 0.33, cab_top + s * 0.04),
               (cx + s * 0.33, cab_top + s * 0.04), (cx + s * 0.47, cab_bot + s * 0.02)], fill=RED_DARK)
    # rear window
    d.polygon([(cx - s * 0.37, cab_bot - s * 0.015), (cx - s * 0.27, cab_top + s * 0.075),
               (cx + s * 0.27, cab_top + s * 0.075), (cx + s * 0.37, cab_bot - s * 0.015)], fill=(34, 40, 70))
    # window glare
    d.polygon([(cx - s * 0.22, cab_bot - s * 0.015), (cx - s * 0.08, cab_top + s * 0.075),
               (cx + s * 0.02, cab_top + s * 0.075), (cx - s * 0.12, cab_bot - s * 0.015)], fill=(80, 96, 150))
    # main body
    body_top = by - s * 0.54
    body_bot = by - s * 0.10
    d.rounded_rectangle([cx - s * 0.52, body_top, cx + s * 0.52, body_bot], radius=s * 0.12, fill=RED)
    # top highlight strip
    d.rounded_rectangle([cx - s * 0.47, body_top + s * 0.02, cx + s * 0.47, body_top + s * 0.07], radius=s * 0.03, fill=RED_LIGHT)
    # bumper
    d.rounded_rectangle([cx - s * 0.50, body_bot - s * 0.11, cx + s * 0.50, body_bot + s * 0.02], radius=s * 0.06, fill=(28, 26, 34))
    # spoiler
    d.rounded_rectangle([cx - s * 0.50, body_top - s * 0.035, cx + s * 0.50, body_top + s * 0.015], radius=s * 0.02, fill=(28, 26, 34))
    # tail lights with glow
    glow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    ly0, ly1 = body_top + s * 0.11, body_top + s * 0.22
    for sx in (-1, 1):
        x_in, x_out = cx + sx * s * 0.20, cx + sx * s * 0.47
        gd.rounded_rectangle([min(x_in, x_out) - s * 0.03, ly0 - s * 0.03, max(x_in, x_out) + s * 0.03, ly1 + s * 0.03], radius=s * 0.05, fill=(255, 60, 30, 200))
    glow = glow.filter(ImageFilter.GaussianBlur(s * 0.04))
    layer.alpha_composite(glow)
    d = ImageDraw.Draw(layer)
    for sx in (-1, 1):
        x_in, x_out = cx + sx * s * 0.20, cx + sx * s * 0.47
        d.rounded_rectangle([min(x_in, x_out), ly0, max(x_in, x_out), ly1], radius=s * 0.035, fill=(255, 214, 120))
        d.rounded_rectangle([min(x_in, x_out) + s * 0.015, ly0 + s * 0.015, max(x_in, x_out) - s * 0.015, ly1 - s * 0.015], radius=s * 0.025, fill=(255, 70, 40))
    # license plate (white with blue strip)
    pw, ph = s * 0.30, s * 0.09
    py0 = ly1 + s * 0.05
    d.rounded_rectangle([cx - pw / 2, py0, cx + pw / 2, py0 + ph], radius=s * 0.015, fill=(250, 250, 250))
    d.rectangle([cx - pw / 2 + s * 0.01, py0 + s * 0.01, cx - pw / 2 + s * 0.05, py0 + ph - s * 0.01], fill=(30, 70, 200))
    # exhausts
    for sx in (-1, 1):
        ex = cx + sx * s * 0.30
        d.ellipse([ex - s * 0.035, body_bot - s * 0.07, ex + s * 0.035, body_bot - s * 0.02], fill=(150, 150, 160))
        d.ellipse([ex - s * 0.022, body_bot - s * 0.06, ex + s * 0.022, body_bot - s * 0.03], fill=(20, 20, 24))


def draw_speed_lines(layer, box, count_side=3, color=(255, 255, 255, 235)):
    """Tapered speed streaks on both sides of box=(x0,y0,x1,y1) (car bbox)."""
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    h = y1 - y0
    wbox = x1 - x0
    spec = [(0.22, 0.62, 0.045), (0.47, 0.90, 0.036), (0.72, 0.50, 0.040)]
    for fy, flen, fth in spec[:count_side]:
        for side, off in ((-1, 0.0), (1, 0.07)):
            y = y0 + h * (fy + off)
            ln, th = wbox * flen, wbox * fth
            xe = (x0 - wbox * 0.07) if side < 0 else (x1 + wbox * 0.07)
            tip = xe + side * ln
            # rounded head near the car, sharp tail away from it
            d.ellipse([xe - th / 2, y - th / 2, xe + th / 2, y + th / 2], fill=color)
            d.polygon([(xe, y - th / 2), (xe, y + th / 2), (tip, y + th * 0.08), (tip, y - th * 0.08)], fill=color)


def make_icon(size=1024):
    W = size * SS
    horizon = int(W * 0.46)
    bg = draw_scene(W, W, horizon, W // 2, int(W * 0.78)).convert("RGBA")
    car_w = W * 0.46
    by = W * 0.90
    draw_speed_lines(bg, (W / 2 - car_w / 2, by - car_w * 0.86, W / 2 + car_w / 2, by))
    draw_car(bg, W / 2, by, car_w)
    return bg.convert("RGB").resize((size, size), Image.LANCZOS)


def make_adaptive(size=432):
    W = size * SS
    # Background: full-bleed scene (only centre 72/108 visible, masked by launcher)
    horizon = int(W * 0.47)
    bg = draw_scene(W, W, horizon, W // 2, int(W * 0.62)).resize((size, size), Image.LANCZOS)
    # Foreground: car + speed lines inside the 66dp safe circle (61% of 108dp)
    fg = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    car_w = W * 0.34
    by = W * 0.69
    draw_speed_lines(fg, (W / 2 - car_w / 2, by - car_w * 0.86, W / 2 + car_w / 2, by), count_side=3)
    draw_car(fg, W / 2, by, car_w)
    fg = fg.resize((size, size), Image.LANCZOS)
    return fg, bg


def make_feature(w=1024, h=500):
    W, H = w * SS, h * SS
    horizon = int(H * 0.58)
    bg = draw_scene(W, H, horizon, int(W * 0.70), int(W * 0.52)).convert("RGBA")
    car_w = H * 0.50
    cx, by = W * 0.70, H * 0.95
    draw_speed_lines(bg, (cx - car_w / 2, by - car_w * 0.86, cx + car_w / 2, by))
    draw_car(bg, cx, by, car_w)
    # title
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    for root, _, files in os.walk("/usr/share/fonts"):
        if "DejaVuSans-Bold.ttf" in files:
            font_path = os.path.join(root, "DejaVuSans-Bold.ttf")
    txt = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    td = ImageDraw.Draw(txt)
    f1 = ImageFont.truetype(font_path, int(H * 0.21))
    f2 = ImageFont.truetype(font_path, int(H * 0.075))
    x = int(W * 0.05)
    lines = [("TRAFFIC", f1, int(H * 0.10)), ("RUSH", f1, int(H * 0.33))]
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for t, f, y in lines:
        sd.text((x + H * 0.015, y + H * 0.02), t, font=f, fill=(60, 0, 20, 200))
    shadow = shadow.filter(ImageFilter.GaussianBlur(H * 0.01))
    bg.alpha_composite(shadow)
    for t, f, y in lines:
        td.text((x, y), t, font=f, fill=(255, 255, 255), stroke_width=int(H * 0.012), stroke_fill=(120, 10, 30))
    td.text((x + H * 0.01, int(H * 0.60)), "Tiranë – Durrës", font=f2, fill=(255, 240, 210), stroke_width=int(H * 0.006), stroke_fill=(120, 10, 30))
    bg.alpha_composite(txt)
    return bg.convert("RGB").resize((w, h), Image.LANCZOS)


if __name__ == "__main__":
    os.makedirs(ICON_DIR, exist_ok=True)
    icon = make_icon()
    icon.save(os.path.join(ICON_DIR, "icon-1024.png"), optimize=True)
    fg, bg = make_adaptive()
    fg.save(os.path.join(ICON_DIR, "icon-foreground-432.png"), optimize=True)
    bg.save(os.path.join(ICON_DIR, "icon-background-432.png"), optimize=True)
    make_feature().save(os.path.join(STORE_DIR, "feature-graphic.png"), optimize=True)
    # previews (scratch): small icon, and adaptive composite with circle mask
    scratch = os.environ.get("PREVIEW_DIR")
    if not scratch:
        print("ok"); sys.exit(0)
    icon.resize((96, 96), Image.LANCZOS).save(os.path.join(scratch, "icon-96.png"))
    comp = bg.convert("RGBA")
    comp.alpha_composite(fg)
    m = Image.new("L", (432, 432), 0)
    ImageDraw.Draw(m).ellipse([72, 72, 360, 360], fill=255)  # 72dp visible circle (of 108)
    out = Image.new("RGBA", (432, 432), (255, 255, 255, 255))
    out.paste(comp, (0, 0), m)
    ImageDraw.Draw(out).ellipse([432 * (21 / 108), 432 * (21 / 108), 432 * (87 / 108), 432 * (87 / 108)], outline=(0, 200, 0, 255), width=2)
    out.save(os.path.join(scratch, "adaptive-preview.png"))
    print("ok")
