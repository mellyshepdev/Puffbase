from PIL import Image, ImageFilter
import numpy as np
from scipy.ndimage import uniform_filter, binary_fill_holes, binary_closing

SRC = 'client/src/assets/ooze-header.png'
OUT = 'client/src/assets/ooze-drip-top.png'

im = Image.open(SRC).convert('RGB')
P = np.array(im).astype(np.float32)
H, W, _ = P.shape
yy, xx = np.mgrid[0:H, 0:W]
cell = ((yy - 36) // 46 + xx // 46) % 2
c = np.where(cell == 0, 208.0, 164.0)
sign = np.where(cell == 0, 1.0, -1.0)

lum = P.mean(2)
corr = uniform_filter((lum - uniform_filter(lum, 92)) * sign, 92)
k = np.clip(corr / 22.0, 0.0, 1.0)  # 1 - alpha
k = uniform_filter(k, 8)
A = np.clip(1.0 - k, 0.0, 1.0)

O = (P - k[..., None] * c[..., None]) / np.maximum(A, 0.06)[..., None]
O = np.clip(O, 0, 255)

sat = (P.max(2) - P.min(2))
sil = binary_fill_holes(binary_closing(sat > 14, np.ones((5, 5))))
alpha = np.where(sil, A * 255.0, 0.0)
alpha = np.array(Image.fromarray(alpha.astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)

img = Image.fromarray(np.dstack([O.astype(np.uint8), np.clip(alpha, 0, 255).astype(np.uint8)]), 'RGBA')
a8 = np.clip(alpha, 0, 255).astype(np.uint8)
ys = np.where(a8.max(1) > 10)[0]
xs = np.where(a8.max(0) > 10)[0]
img = img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
img.save(OUT)
print('saved', img.size)

bg = Image.new('RGBA', img.size, (16, 11, 26, 255))
bg.alpha_composite(img)
bg.thumbnail((800, 800))
bg.convert('RGB').save('/tmp/check_top.jpg', quality=88)
