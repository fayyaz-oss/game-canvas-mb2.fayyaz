/**
 * Game Renderer for Super Volley Arena
 * High visual polish with 3 arena themes, particle effects, expressive characters, and juice.
 */

class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.theme = 'beach'; // 'beach' | 'neon' | 'indoor'
        this.particles = [];
        this.floatingTexts = [];
        this.confetti = [];
        this.screenShake = 0;
        this.waveOffset = 0;
    }

    setTheme(themeName) {
        this.theme = themeName;
    }

    triggerScreenShake(intensity = 12) {
        this.screenShake = intensity;
    }

    addHitSparks(x, y, isSuper = false, color = '#FFD700') {
        const count = isSuper ? 30 : 16;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * (isSuper ? 10 : 6)) + 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * (isSuper ? 6 : 4) + 2,
                color: isSuper ? (Math.random() > 0.5 ? '#FF4500' : '#FFD700') : color,
                alpha: 1.0,
                decay: Math.random() * 0.03 + 0.02,
                gravity: 0.15
            });
        }
    }

    addFloatingText(text, x, y, color = '#FFFFFF', size = 26) {
        this.floatingTexts.push({
            text, x, y,
            vy: -2.2,
            alpha: 1.0,
            color,
            size,
            scale: 0.5,
            targetScale: 1.2
        });
    }

    addConfetti() {
        const colors = ['#FF4757', '#2ED573', '#1E90FF', '#FFA502', '#9B59B6', '#FFD700'];
        for (let i = 0; i < 90; i++) {
            this.confetti.push({
                x: Math.random() * COURT.WIDTH,
                y: -20 - Math.random() * 200,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2,
                size: Math.random() * 8 + 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.15,
                alpha: 1.0
            });
        }
    }

    render(ball, p1, p2, gameState) {
        const ctx = this.ctx;
        ctx.save();

        // 1. Screenshake effect
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShake;
            ctx.translate(shakeX, shakeY);
            this.screenShake *= 0.88;
            if (this.screenShake < 0.5) this.screenShake = 0;
        }

        // 2. Gambar Arena Background
        this.renderBackground();

        // 3. Gambar Bayangan Lantai
        this.renderShadows(ball, p1, p2);

        // 4. Gambar Net Bagian Belakang (Tiang & Jaring)
        this.renderNet();

        // 5. Gambar Karakter Pemain
        this.renderPlayer(p1);
        this.renderPlayer(p2);

        // 6. Gambar Bola Voli
        this.renderBall(ball);

        // 7. Partikel & Floating Text
        this.renderParticles();
        this.renderFloatingTexts();
        this.renderConfetti();

        ctx.restore();
    }

    renderBackground() {
        const ctx = this.ctx;
        const w = COURT.WIDTH;
        const h = COURT.HEIGHT;
        const gy = COURT.GROUND_Y;

        this.waveOffset += 0.03;

        if (this.theme === 'beach') {
            // Sunny Tropical Sunset Beach
            const skyGrad = ctx.createLinearGradient(0, 0, 0, gy);
            skyGrad.addColorStop(0, '#FF5E62');
            skyGrad.addColorStop(0.35, '#FF9966');
            skyGrad.addColorStop(0.65, '#FBD786');
            skyGrad.addColorStop(1, '#C6FFDD');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, w, gy);

            // Matahari Senja
            const sunGrad = ctx.createRadialGradient(w * 0.5, gy * 0.55, 10, w * 0.5, gy * 0.55, 140);
            sunGrad.addColorStop(0, 'rgba(255, 255, 230, 0.95)');
            sunGrad.addColorStop(0.4, 'rgba(255, 200, 100, 0.6)');
            sunGrad.addColorStop(1, 'rgba(255, 120, 50, 0)');
            ctx.fillStyle = sunGrad;
            ctx.beginPath();
            ctx.arc(w * 0.5, gy * 0.55, 140, 0, Math.PI * 2);
            ctx.fill();

            // Lautan & Ombak
            const oceanGrad = ctx.createLinearGradient(0, gy * 0.65, 0, gy);
            oceanGrad.addColorStop(0, '#1cb5e0');
            oceanGrad.addColorStop(1, '#000046');
            ctx.fillStyle = oceanGrad;
            ctx.fillRect(0, gy * 0.65, w, gy * 0.35);

            // Garis buih ombak bergerak
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let x = 0; x <= w; x += 15) {
                const y = gy * 0.72 + Math.sin(x * 0.02 + this.waveOffset) * 6;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Pasir Pantai (Lantai Court)
            const sandGrad = ctx.createLinearGradient(0, gy, 0, h);
            sandGrad.addColorStop(0, '#F3D299');
            sandGrad.addColorStop(0.3, '#E6BD76');
            sandGrad.addColorStop(1, '#CCA258');
            ctx.fillStyle = sandGrad;
            ctx.fillRect(0, gy, w, h - gy);

            // Tekstur garis pasir
            ctx.strokeStyle = 'rgba(180, 130, 60, 0.25)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, gy + 1);
            ctx.lineTo(w, gy + 1);
            ctx.stroke();

        } else if (this.theme === 'neon') {
            // Cyber Neon Stadium
            const bgGrad = ctx.createLinearGradient(0, 0, 0, gy);
            bgGrad.addColorStop(0, '#090A1A');
            bgGrad.addColorStop(0.7, '#121436');
            bgGrad.addColorStop(1, '#241442');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, gy);

            // Lampu sorot neon
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const spot1 = ctx.createRadialGradient(250, 80, 20, 250, 80, 450);
            spot1.addColorStop(0, 'rgba(255, 0, 128, 0.35)');
            spot1.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = spot1;
            ctx.fillRect(0, 0, w, gy);

            const spot2 = ctx.createRadialGradient(950, 80, 20, 950, 80, 450);
            spot2.addColorStop(0, 'rgba(0, 255, 230, 0.35)');
            spot2.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = spot2;
            ctx.fillRect(0, 0, w, gy);
            ctx.restore();

            // Lantai Grid Neon
            ctx.fillStyle = '#060714';
            ctx.fillRect(0, gy, w, h - gy);

            ctx.strokeStyle = '#00F0FF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();

            // Garis grid perspektif lantai
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
            ctx.lineWidth = 1.5;
            for (let x = 0; x <= w; x += 60) {
                ctx.beginPath();
                ctx.moveTo(x, gy);
                ctx.lineTo(x + (x - w / 2) * 0.4, h);
                ctx.stroke();
            }
        } else {
            // Indoor Olympic Gymnasium
            const hallGrad = ctx.createLinearGradient(0, 0, 0, gy);
            hallGrad.addColorStop(0, '#1E293B');
            hallGrad.addColorStop(0.6, '#334155');
            hallGrad.addColorStop(1, '#475569');
            ctx.fillStyle = hallGrad;
            ctx.fillRect(0, 0, w, gy);

            // Lampu Hall & Penonton
            ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
            ctx.fillRect(0, gy * 0.65, w, gy * 0.35);

            // Lantai Kayu Lapangan Indoor
            const woodGrad = ctx.createLinearGradient(0, gy, 0, h);
            woodGrad.addColorStop(0, '#E58E26');
            woodGrad.addColorStop(0.5, '#D35400');
            woodGrad.addColorStop(1, '#A04000');
            ctx.fillStyle = woodGrad;
            ctx.fillRect(0, gy, w, h - gy);

            // Garis court putih resmi
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 4;
            ctx.strokeRect(COURT.LEFT_WALL, gy, COURT.RIGHT_WALL - COURT.LEFT_WALL, h - gy);
            ctx.beginPath();
            ctx.moveTo(COURT.LEFT_WALL, gy);
            ctx.lineTo(COURT.RIGHT_WALL, gy);
            ctx.stroke();
        }

        // Garis Lapangan Resmi (Center & Attack Line 3m)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        // Garis serang 3-meter kiri & kanan
        ctx.beginPath();
        ctx.moveTo(380, gy);
        ctx.lineTo(380, gy + 30);
        ctx.moveTo(820, gy);
        ctx.lineTo(820, gy + 30);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    renderShadows(ball, p1, p2) {
        const ctx = this.ctx;
        const gy = COURT.GROUND_Y;

        const drawShadow = (x, y, baseRadius, maxScale = 1.0) => {
            const heightAboveGround = gy - y;
            const factor = Math.max(0.2, 1 - heightAboveGround / 450);
            const radiusX = baseRadius * factor * maxScale;
            const radiusY = radiusX * 0.3;
            const alpha = 0.35 * factor;

            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.beginPath();
            ctx.ellipse(x, gy + 4, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
        };

        // Bayangan bola di lantai
        drawShadow(ball.x, ball.y, ball.radius * 1.3);

        // Bayangan pemain
        drawShadow(p1.x, p1.y + p1.height, p1.width * 0.7);
        drawShadow(p2.x, p2.y + p2.height, p2.width * 0.7);
    }

    renderNet() {
        const ctx = this.ctx;
        const nx = COURT.NET_X;
        const nw = COURT.NET_WIDTH;
        const topY = COURT.NET_TOP_Y;
        const gy = COURT.GROUND_Y;

        // Tiang Net (Post)
        ctx.fillStyle = '#4B6584';
        ctx.fillRect(nx - nw / 2 - 3, topY - 10, nw + 6, gy - topY + 10);
        ctx.fillStyle = '#778CA3';
        ctx.fillRect(nx - 2, topY - 10, 4, gy - topY + 10);

        // Jaring Net (Checkered Mesh)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.5;
        const meshSize = 14;
        for (let y = topY; y < gy; y += meshSize) {
            ctx.beginPath();
            ctx.moveTo(nx - nw / 2, y);
            ctx.lineTo(nx + nw / 2, y);
            ctx.stroke();
        }

        // Pita Putih Atas Net (Top Tape)
        ctx.fillStyle = '#F5F6FA';
        ctx.fillRect(nx - nw / 2 - 2, topY - 6, nw + 4, 12);
        ctx.strokeStyle = '#DCDDE1';
        ctx.lineWidth = 1;
        ctx.strokeRect(nx - nw / 2 - 2, topY - 6, nw + 4, 12);

        // Antena Merah-Putih di atas net
        const antH = COURT.ANTENNA_HEIGHT;
        const antX = nx;
        const antY = topY - antH;
        ctx.lineWidth = 4;
        const stripeCount = 7;
        const segH = antH / stripeCount;
        for (let i = 0; i < stripeCount; i++) {
            ctx.strokeStyle = (i % 2 === 0) ? '#EB3B5A' : '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(antX, antY + i * segH);
            ctx.lineTo(antX, antY + (i + 1) * segH);
            ctx.stroke();
        }
    }

    renderPlayer(p) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(p.x, p.y + p.height / 2);

        // Squash & Stretch
        ctx.scale(p.squash * p.facing, p.stretch);

        // Glow Aura jika Super Spike Meter penuh
        if (p.powerMeter >= 100) {
            ctx.shadowColor = '#FF4757';
            ctx.shadowBlur = 20;
        }

        const headR = p.headRadius;
        const bodyH = p.height - headR * 1.2;

        if (p.isDiving) {
            // Render Pose Diving (Meluncur datar di lantai)
            ctx.rotate(0.15);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.height * 0.45, headR * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Kepala
            ctx.fillStyle = '#FFEAA7';
            ctx.beginPath();
            ctx.arc(p.height * 0.35, -5, headR * 0.75, 0, Math.PI * 2);
            ctx.fill();

            // Tangan lurus ke depan
            ctx.fillStyle = '#FED330';
            ctx.beginPath();
            ctx.ellipse(p.height * 0.55, 5, 14, 6, 0, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // Render Pose Normal / Melompat
            // 1. Badan / Jersey
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.roundRect(-p.width / 2, -headR * 0.2, p.width, bodyH, [12, 12, 6, 6]);
            ctx.fill();

            // Garis Aksen Jersey
            ctx.fillStyle = p.accent;
            ctx.fillRect(-p.width / 2 + 5, bodyH * 0.2, p.width - 10, 6);

            // Nomor Punggung / Dada (#1 atau #7)
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 15px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.id === 'p1' ? '1' : '7', 0, bodyH * 0.5);

            // 2. Kepala (Skin tone hangat)
            ctx.fillStyle = '#FFEAA7';
            ctx.beginPath();
            ctx.arc(0, -headR * 0.75, headR, 0, Math.PI * 2);
            ctx.fill();

            // 3. Headband / Topi Atletik
            ctx.fillStyle = p.accent;
            ctx.fillRect(-headR, -headR * 1.2, headR * 2, 8);

            // 4. Mata Ekspresif (Melihat ke arah bola)
            ctx.fillStyle = '#2F3542';
            ctx.beginPath();
            // Mata kanan
            ctx.arc(headR * 0.4, -headR * 0.75, 4, 0, Math.PI * 2);
            // Mata kiri
            ctx.arc(headR * 0.05, -headR * 0.75, 4, 0, Math.PI * 2);
            ctx.fill();

            // Kilau mata putih
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(headR * 0.45, -headR * 0.8, 1.5, 0, Math.PI * 2);
            ctx.arc(headR * 0.1, -headR * 0.8, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // 5. Tangan & Animasi Spike
            ctx.fillStyle = '#FFEAA7';
            if (p.isSpiking) {
                // Tangan terangkat tinggi mengayun ke depan
                ctx.beginPath();
                ctx.ellipse(headR * 0.8, -headR * 1.6, 8, 22, Math.PI * 0.25, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Posisi tangan siap pasing di depan
                ctx.beginPath();
                ctx.ellipse(headR * 0.7, bodyH * 0.3, 7, 14, Math.PI * 0.15, 0, Math.PI * 2);
                ctx.fill();
            }

            // 6. Sepatu / Kaki
            ctx.fillStyle = '#2C3A47';
            ctx.beginPath();
            ctx.roundRect(-p.width * 0.4, bodyH - 4, 14, 10, [4, 4, 2, 2]);
            ctx.roundRect(p.width * 0.1, bodyH - 4, 14, 10, [4, 4, 2, 2]);
            ctx.fill();
        }

        ctx.restore();
    }

    renderBall(ball) {
        const ctx = this.ctx;
        ctx.save();

        // 1. Gambar Trail (Ekor Jejak Gerak Bola)
        if (ball.trail && ball.trail.length > 1) {
            for (let i = 0; i < ball.trail.length - 1; i++) {
                const pt = ball.trail[i];
                const nextPt = ball.trail[i + 1];
                const ratio = 1 - (i / ball.trail.length);

                ctx.strokeStyle = ball.isSuperSpike
                    ? `rgba(255, 69, 0, ${ratio * 0.85})`
                    : `rgba(255, 235, 59, ${ratio * 0.45})`;

                ctx.lineWidth = ball.radius * (ball.isSuperSpike ? 1.8 : 1.2) * ratio;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(pt.x, pt.y);
                ctx.lineTo(nextPt.x, nextPt.y);
                ctx.stroke();
            }
        }

        ctx.translate(ball.x, ball.y);
        ctx.rotate(ball.rotation);

        // Glow pada Super Spike
        if (ball.isSuperSpike) {
            ctx.shadowColor = '#FF3838';
            ctx.shadowBlur = 25;
        }

        // 2. Badan Dasar Bola (Putih)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        // 3. Pola Garis Spiral Voli Klasik (Biru & Kuning)
        const r = ball.radius;
        // Panel Biru
        ctx.fillStyle = '#1B9CFC';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 0.65);
        ctx.quadraticCurveTo(0, 0, 0, 0);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI, Math.PI * 1.65);
        ctx.quadraticCurveTo(0, 0, 0, 0);
        ctx.fill();

        // Panel Kuning Emas
        ctx.fillStyle = '#F3A683';
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI * 0.65, Math.PI * 1.0);
        ctx.quadraticCurveTo(0, 0, 0, 0);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI * 1.65, Math.PI * 2.0);
        ctx.quadraticCurveTo(0, 0, 0, 0);
        ctx.fill();

        // Garis Jahitan Bola
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(r, 0);
        ctx.moveTo(0, -r);
        ctx.lineTo(0, r);
        ctx.stroke();

        // Efek Shading 3D Mengkilap
        const shine = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 2, -r * 0.35, -r * 0.35, r);
        shine.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        shine.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        shine.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
        ctx.fillStyle = shine;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    renderParticles() {
        const ctx = this.ctx;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    renderFloatingTexts() {
        const ctx = this.ctx;
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.022;
            ft.scale += (ft.targetScale - ft.scale) * 0.2;

            if (ft.alpha <= 0) {
                this.floatingTexts.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.translate(ft.x, ft.y);
            ctx.scale(ft.scale, ft.scale);
            ctx.font = `900 ${ft.size}px Outfit, sans-serif`;
            ctx.textAlign = 'center';

            // Text Outline Hitam
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 5;
            ctx.strokeText(ft.text, 0, 0);

            // Text Fill Warna
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, 0, 0);
            ctx.restore();
        }
    }

    renderConfetti() {
        const ctx = this.ctx;
        for (let i = this.confetti.length - 1; i >= 0; i--) {
            const c = this.confetti[i];
            c.x += c.vx;
            c.y += c.vy;
            c.rotation += c.vRot;

            if (c.y > COURT.HEIGHT + 30) {
                this.confetti.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rotation);
            ctx.fillStyle = c.color;
            ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
            ctx.restore();
        }
    }
}

window.GameRenderer = GameRenderer;
