# TCM Cinematic — Living Portrait

Website cinematic interaktif berbasis **Three.js**: potret 2D yang terlihat hidup —
kepala dan tubuhnya bergerak mengikuti kursor, plus "napas" idle halus walau kursor diam.
Dibungkus letterbox sinematik, film grain, debu emas melayang, dan animasi scroll GSAP.

## Cara Menjalankan

Tidak perlu build. Cukup serve foldernya:

```bash
npx serve .
# atau
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000`.

> Harus lewat HTTP server (bukan buka file langsung) karena browser memblokir
> module import & texture loading dari `file://`.

## Cara Kerja Efeknya

Efek "kepala bergerak" memakai teknik **depth-map parallax** (fake 3D dari foto 2D):

1. **Gambar warna** (`assets/portrait.jpg`) — potret biasa.
2. **Depth map** (`assets/portrait-depth.jpg`) — grayscale: makin terang = makin dekat
   ke kamera (hidung paling terang, latar hitam).
3. Custom shader menggeser tiap piksel searah kursor **proporsional dengan kedalamannya**.
   Piksel dekat bergeser banyak, piksel jauh bergeser berlawanan → ilusi kepala menoleh
   dan tubuh bergeser posisi.

Selama file aset belum ada, website memakai potret prosedural (digambar via canvas)
supaya efeknya langsung bisa dilihat. **Ganti dengan gambar hasil AI-mu** untuk hasil final.

## Aset yang Dibutuhkan

| File | Ukuran disarankan | Keterangan |
|---|---|---|
| `assets/portrait.jpg` | 1536×2048 (rasio 3:4) | Potret utama hero |
| `assets/portrait-depth.jpg` | sama dengan portrait | Depth map grayscale |
| `assets/gallery-1..3.jpg` + `-depth.jpg` | 1024×1366 | 3 potret galeri |

### Membuat depth map (gratis & cepat)

- **Depth Anything V2** — https://huggingface.co/spaces/depth-anything/Depth-Anything-V2
  (upload foto → download depth map). Paling akurat saat ini.
- Alternatif: **Marigold**, **ZoeDepth** (juga di Hugging Face Spaces).
- Tips: blur depth map sedikit (Gaussian 4–8px) supaya transisi halus, tidak "sobek".

---

## Prompt Generate GAMBAR (Midjourney / Flux / DALL·E / Ideogram)

Kunci untuk efek ini: **subjek menghadap kamera, latar sederhana & gelap, pencahayaan
dramatis satu arah, bahu terlihat**. Hindari pose miring ekstrem — parallax-nya yang
akan "menolehkan" kepala.

**Hero portrait (utama):**
```
cinematic portrait of an elegant Indonesian woman facing camera, head and
shoulders visible, dramatic Rembrandt lighting with warm golden rim light
from the right, dark charcoal background with subtle haze, shallow depth
of field, film still, Kodak Portra 800, 85mm lens, moody atmosphere,
ultra detailed skin texture --ar 3:4 --style raw
```

**Galeri (variasikan karakter):**
```
cinematic portrait of a young batik artisan, warm candlelight from one side,
dark smoky background, facing camera, head and shoulders, film noir mood,
golden accent light, 85mm, photorealistic --ar 3:4
```
```
cinematic portrait of a wayang puppet master, dramatic single spotlight,
deep shadows, dark stage background, facing forward, embers floating in
the air, movie still quality --ar 3:4
```
```
cinematic portrait of a silat warrior in traditional attire, blue moonlight
rim light against warm key light, misty dark background, facing camera,
intense gaze, film grain --ar 3:4
```

**Aturan main prompt gambar untuk efek parallax:**
- `facing camera, head and shoulders` → wajib, supaya gerakan kepala natural.
- `dark simple background` → depth map jadi bersih, latar tidak ikut sobek.
- `rim light / one directional light` → dimensi wajah terasa saat bergeser.
- Rasio `--ar 3:4` sesuai bidang potret di website.

## Prompt Generate VIDEO (Runway Gen-3 / Kling / Hailuo / Luma)

Video cocok untuk section pembuka fullscreen atau background transisi antar-babak
(bisa ditambahkan sebagai `<video>` layer — tinggal bilang kalau mau dipasangkan).

**Establishing shot (pembuka):**
```
Slow cinematic dolly-in toward a portrait of a woman in darkness, golden
dust particles floating through a single beam of warm light, she slowly
turns her head toward camera and her eyes open, subtle wind moves her hair,
heavy atmosphere, film grain, anamorphic lens flare, 4k, 24fps
```

**Loop background (seamless):**
```
Golden dust particles drifting slowly in dark void, volumetric light rays
from upper right, gentle turbulence, seamless loop, cinematic, dark amber
and charcoal palette, no subject, slow motion
```

**Transisi antar-section:**
```
Camera glides through layers of dark silk fabric revealing warm light
behind, slow motion, cinematic macro, amber and black color grade
```

**Tips video:** minta `24fps`, `slow motion`, `film grain`, dan `dark palette`
supaya nyambung dengan grade website. Untuk Kling/Hailuo, upload dulu gambar
hero-mu sebagai frame pertama (image-to-video) — hasil gerakan kepala jauh
lebih konsisten daripada text-to-video murni.

---

## Ide Pengembangan Berikutnya

1. **Scroll-driven storytelling** — tiap scroll = satu "babak", kamera Three.js
   terbang antar karakter (sudah ada fondasinya di ScrollTrigger).
2. **Mode gyroscope** — di HP, potret bergerak mengikuti kemiringan device.
3. **Audio reaktif** — musik ambient + partikel bergetar mengikuti beat (Web Audio API).
4. **Hover-to-life galeri** — potret galeri diam, lalu "menoleh" saat di-hover.
5. **Depth dari video** — video pendek + depth per-frame untuk potret yang benar-benar
   berkedip dan bernapas (butuh preprocessing, hasilnya next-level).
6. **Kursor custom sinematik** — lingkaran lensa fokus yang membesar di elemen interaktif.
7. **Transisi halaman WebGL** — shader wipe/dissolve antar halaman, bukan reload biasa.

## Struktur

```
index.html      — markup 4 babak (hero, cerita, galeri, kontak)
css/style.css   — letterbox, grain, tipografi sinematik
js/main.js      — scene Three.js, shader depth-parallax, GSAP scroll
assets/         — taruh gambar hasil AI di sini
```
