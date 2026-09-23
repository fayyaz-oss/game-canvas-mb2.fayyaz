# Super Volley Arena 🏐🔥
**Game Bola Voli 2D Arcade Physics & Multiplayer WebRTC**

Game bola voli web berbasis JavaScript murni (Vanilla HTML5, CSS3, Web Audio API, dan PeerJS WebRTC) yang seru, responsif, dan kaya fitur visual.

---

## 🌟 Fitur Utama

1. **Mode Permainan Lengkap**:
   - **Solo vs Bot AI**: 3 tingkat kesulitan (*Easy*, *Normal*, *Pro*) dengan AI yang memperhitungkan lintasan parabola bola.
   - **2 Pemain Lokal (1 Keyboard)**: Main berdua di satu komputer/laptop tanpa delay.
   - **Online Multiplayer P2P (WebRTC)**: Hubungkan 2 pemain di browser/perangkat berbeda hanya dengan membagikan 4-karakter Room Code tanpa perlu server backend database.

2. **Fisika & Gameplay Realistis**:
   - Gravitasi, rotasi & pantulan bola di net maupun ujung tiang.
   - Variasi pukulan: *Normal Bump*, *Diving Slide Save* (penyelamatan bola rendah), dan *Airborne Spike / Smash*.
   - **Super Spike Meter**: Kumpulkan energi passing untuk meluncurkan *Fireball Smash* bertenaga tinggi!
   - Aturan skor resmi voli (Deuce lead-by-2, pilihan 5 / 7 / 11 / 21 poin).

3. **Audio & Visual Premium**:
   - **Web Audio API Synthesizer**: Peluit wasit, dentuman smash bass, sorak penonton, dan nada skor tanpa dependensi file eksternal.
   - 3 Arena: *Sunset Tropical Beach*, *Cyber Neon Arena*, dan *Olympic Indoor Gym*.
   - Partikel benturan, getaran layar (*screenshake*), jejak api bola, dan confetti selebrasi kemenangan.

---

## 🎮 Kontrol Permainan

| Aksi | Pemain 1 (Kiri) | Pemain 2 (Kanan) |
|---|---|---|
| **Gerak Kiri / Kanan** | `A` / `D` | `Panah Kiri (←)` / `Panah Kanan (→)` |
| **Lompat** | `W` | `Panah Atas (↑)` |
| **Diving Slide** | `S` | `Panah Bawah (↓)` |
| **Spike / Smash** (di udara) | `Spasi (Space)` | `Enter` / `Numpad 0` |

*Tersedia juga tombol virtual otomatis untuk layar sentuh (mobile/tablet).*

---

## 🚀 Cara Menjalankan Game

Buka terminal pada direktori game dan jalankan server lokal:

```bash
# Opsi 1: Menggunakan npx serve
npx serve .

# Opsi 2: Menggunakan Python
python -m http.server 8000
```

Lalu buka browser Anda di `http://localhost:8000` (atau port yang ditampilkan).
