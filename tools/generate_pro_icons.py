import os
from PIL import Image, ImageDraw, ImageFilter

def create_pro_icon(size):
    # Render at 4x for ultra-sharp anti-aliased downsampling
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Rounded App Icon Background (Squircle)
    radius = int(canvas_size * 0.22)
    # Background gradient approximation
    draw.rounded_rectangle(
        [0, 0, canvas_size - 1, canvas_size - 1],
        radius=radius,
        fill=(11, 15, 25, 255),
        outline=(255, 255, 255, 30),
        width=int(scale * 1.5)
    )

    # 2. Glowing Inner Ring / Shield
    center = canvas_size / 2
    r_outer = canvas_size * 0.35
    
    # Outer ring
    draw.ellipse(
        [center - r_outer, center - r_outer, center + r_outer, center + r_outer],
        outline=(99, 102, 241, 140),
        width=int(scale * 2)
    )

    # Accent Arc / Emerald highlight
    draw.arc(
        [center - r_outer, center - r_outer, center + r_outer, center + r_outer],
        start=135,
        end=315,
        fill=(16, 185, 129, 240),
        width=int(scale * 3)
    )

    # 3. Stylized Minimalist Lightning & Spark Emblem
    bolt_pts = [
        (center + canvas_size * 0.04, center - canvas_size * 0.22),
        (center - canvas_size * 0.16, center + canvas_size * 0.02),
        (center - canvas_size * 0.01, center + canvas_size * 0.02),
        (center - canvas_size * 0.06, center + canvas_size * 0.24),
        (center + canvas_size * 0.16, center - canvas_size * 0.01),
        (center + canvas_size * 0.01, center - canvas_size * 0.01),
    ]
    draw.polygon(bolt_pts, fill=(248, 250, 252, 255))

    # Dot Accent (Top Right)
    dot_r = canvas_size * 0.045
    dot_cx = center + canvas_size * 0.22
    dot_cy = center - canvas_size * 0.22
    draw.ellipse(
        [dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r],
        fill=(56, 189, 248, 255)
    )

    # Downsample cleanly to target size with Lanczos filter
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

os.makedirs("coursera-extension/icons", exist_ok=True)
for sz in [16, 32, 48, 128]:
    icon = create_pro_icon(sz)
    icon.save(f"coursera-extension/icons/icon{sz}.png", "PNG")
    print(f"Generated icon{sz}.png")

print("All pro icons created successfully!")
