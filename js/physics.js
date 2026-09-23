/**
 * Physics Engine for Super Volley Arena
 * Handles ball dynamics, player collisions, net bounces, and court boundaries.
 */

const COURT = {
    WIDTH: 1200,
    HEIGHT: 650,
    GROUND_Y: 570,
    NET_X: 600,
    NET_WIDTH: 16,
    NET_TOP_Y: 330, // Ketinggian ujung net
    ANTENNA_HEIGHT: 90, // Antena di atas net
    LEFT_WALL: 25,
    RIGHT_WALL: 1175,
    CEILING: 15,
    GRAVITY: 0.38,
    AIR_DRAG: 0.997,
    BALL_RADIUS: 20
};

class Ball {
    constructor() {
        this.radius = COURT.BALL_RADIUS;
        this.reset(COURT.WIDTH * 0.25, 260);
    }

    reset(x, y, vx = 0, vy = 0) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.rotation = 0;
        this.vRot = 0;
        this.lastHitter = null; // 'p1' | 'p2'
        this.trail = [];
        this.isSuperSpike = false;
        this.spikePower = 1.0;
        this.groundHit = false;
        this.groundHitSide = null; // 'left' | 'right' | 'out'
    }

    update() {
        if (this.groundHit) return;

        // Gravitasi & hambatan udara
        this.vy += COURT.GRAVITY;
        this.vx *= COURT.AIR_DRAG;
        this.vy *= COURT.AIR_DRAG;

        // Batasi kecepatan maksimal bola
        const maxSpeed = this.isSuperSpike ? 34 : 26;
        const currentSpeed = Math.hypot(this.vx, this.vy);
        if (currentSpeed > maxSpeed) {
            this.vx = (this.vx / currentSpeed) * maxSpeed;
            this.vy = (this.vy / currentSpeed) * maxSpeed;
        }

        // Simpan riwayat posisi untuk efek ekor jejak (trail)
        this.trail.unshift({
            x: this.x,
            y: this.y,
            speed: currentSpeed,
            isSuper: this.isSuperSpike
        });
        if (this.trail.length > (this.isSuperSpike ? 16 : 8)) {
            this.trail.pop();
        }

        this.x += this.vx;
        this.y += this.vy;

        // Rotasi bola berdasarkan laju gerak x
        this.vRot = (this.vx * 0.05);
        this.rotation += this.vRot;

        // 1. Tabrakan dengan Dinding Samping
        if (this.x - this.radius < COURT.LEFT_WALL) {
            this.x = COURT.LEFT_WALL + this.radius;
            this.vx = Math.abs(this.vx) * 0.75;
            this.isSuperSpike = false;
        } else if (this.x + this.radius > COURT.RIGHT_WALL) {
            this.x = COURT.RIGHT_WALL - this.radius;
            this.vx = -Math.abs(this.vx) * 0.75;
            this.isSuperSpike = false;
        }

        // 2. Tabrakan dengan Langit-langit (Ceiling)
        if (this.y - this.radius < COURT.CEILING) {
            this.y = COURT.CEILING + this.radius;
            this.vy = Math.abs(this.vy) * 0.7;
        }

        // 3. Tabrakan dengan Net
        this.checkNetCollision();

        // 4. Tabrakan dengan Lantai (Point Scored!)
        if (this.y + this.radius >= COURT.GROUND_Y) {
            this.y = COURT.GROUND_Y - this.radius;
            this.groundHit = true;
            if (this.x < COURT.NET_X) {
                this.groundHitSide = 'left';
            } else {
                this.groundHitSide = 'right';
            }
        }
    }

    checkNetCollision() {
        const netLeft = COURT.NET_X - COURT.NET_WIDTH / 2;
        const netRight = COURT.NET_X + COURT.NET_WIDTH / 2;
        const netTop = COURT.NET_TOP_Y;

        // Rounded Net Top Cap (Lingkaran ujung atas net)
        const capX = COURT.NET_X;
        const capY = netTop;
        const capRadius = COURT.NET_WIDTH / 2;
        const distSq = (this.x - capX) ** 2 + (this.y - capY) ** 2;
        const minDistance = this.radius + capRadius;

        if (distSq < minDistance * minDistance) {
            // Pantulan titik sudut atas net
            const dist = Math.sqrt(distSq) || 0.001;
            const nx = (this.x - capX) / dist;
            const ny = (this.y - capY) / dist;

            // Dorong bola keluar dari net
            this.x = capX + nx * minDistance;
            this.y = capY + ny * minDistance;

            // Refleksi kecepatan
            const dot = this.vx * nx + this.vy * ny;
            this.vx = (this.vx - 2 * dot * nx) * 0.8;
            this.vy = (this.vy - 2 * dot * ny) * 0.8;

            this.isSuperSpike = false;
            if (window.soundEngine) window.soundEngine.playNetBounce();
            return;
        }

        // Batang jaring Net (Di bawah cap)
        if (this.y > netTop && this.y - this.radius < COURT.GROUND_Y) {
            if (this.x + this.radius > netLeft && this.x - this.radius < netRight) {
                if (this.vx > 0) {
                    this.x = netLeft - this.radius;
                    this.vx = -Math.abs(this.vx) * 0.45; // Damping jaring lentur
                } else {
                    this.x = netRight + this.radius;
                    this.vx = Math.abs(this.vx) * 0.45;
                }
                this.vy *= 0.85;
                this.isSuperSpike = false;
                if (window.soundEngine) window.soundEngine.playNetBounce();
            }
        }
    }
}

class Player {
    constructor(id, side, config = {}) {
        this.id = id; // 'p1' | 'p2'
        this.side = side; // 'left' | 'right'
        this.name = config.name || (id === 'p1' ? 'Player 1' : 'Player 2');
        this.color = config.color || (id === 'p1' ? '#FF4757' : '#2ED573');
        this.accent = config.accent || '#FFFFFF';

        // Stats modifier
        this.speedStat = config.speed || 7.2;
        this.jumpStat = config.jump || -14.6;
        this.powerStat = config.power || 1.0;

        // Dimensi & Hitbox
        this.width = 44;
        this.height = 76;
        this.headRadius = 24;

        this.x = side === 'left' ? 280 : 920;
        this.y = COURT.GROUND_Y - this.height;
        this.vx = 0;
        this.vy = 0;
        this.isGrounded = true;
        this.facing = side === 'left' ? 1 : -1; // 1: kanan, -1: kiri

        // Aksi pemain
        this.isDiving = false;
        this.diveTimer = 0;
        this.diveDirection = 1;
        this.isSpiking = false;
        this.spikeCooldown = 0;
        this.touchCount = 0; // Maksimal 3 sentuhan sebelum over-net
        this.powerMeter = 0; // 0 - 100
        this.squash = 1.0; // Animasi squash & stretch
        this.stretch = 1.0;

        // Kontrol input
        this.inputs = {
            left: false,
            right: false,
            up: false,
            down: false,
            spike: false
        };
    }

    resetPosition() {
        this.x = this.side === 'left' ? 280 : 920;
        this.y = COURT.GROUND_Y - this.height;
        this.vx = 0;
        this.vy = 0;
        this.isGrounded = true;
        this.isDiving = false;
        this.diveTimer = 0;
        this.isSpiking = false;
        this.spikeCooldown = 0;
        this.touchCount = 0;
        this.squash = 1.0;
        this.stretch = 1.0;
    }

    update() {
        // Cooldowns & timers
        if (this.spikeCooldown > 0) this.spikeCooldown--;
        if (this.isDiving) {
            this.diveTimer--;
            if (this.diveTimer <= 0) {
                this.isDiving = false;
            }
        }

        // Squash & stretch recovery
        this.squash += (1.0 - this.squash) * 0.15;
        this.stretch += (1.0 - this.stretch) * 0.15;

        // Input gerak horizontal
        if (!this.isDiving) {
            if (this.inputs.left) {
                this.vx = -this.speedStat;
                this.facing = -1;
            } else if (this.inputs.right) {
                this.vx = this.speedStat;
                this.facing = 1;
            } else {
                this.vx *= 0.72; // Gesekan lantai
            }

            // Lompat
            if (this.inputs.up && this.isGrounded) {
                this.vy = this.jumpStat;
                this.isGrounded = false;
                this.stretch = 1.35;
                this.squash = 0.75;
                if (window.soundEngine) window.soundEngine.playJump();
            }

            // Dive (pasing meluncur di lantai)
            if (this.inputs.down && this.isGrounded && !this.isDiving) {
                this.isDiving = true;
                this.diveTimer = 18;
                this.diveDirection = this.facing;
                this.vx = this.diveDirection * (this.speedStat * 1.55);
            }
        } else {
            // Ketika sedang diving
            this.vx *= 0.93;
        }

        // Spike Trigger saat di udara
        if (this.inputs.spike && !this.isGrounded && this.spikeCooldown <= 0) {
            this.isSpiking = true;
            this.spikeCooldown = 25;
            this.stretch = 1.25;
        } else if (this.spikeCooldown < 15) {
            this.isSpiking = false;
        }

        // Gravitasi vertikal
        if (!this.isGrounded) {
            this.vy += COURT.GRAVITY;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Batas lantai
        const targetFloorY = COURT.GROUND_Y - (this.isDiving ? this.height * 0.45 : this.height);
        if (this.y >= targetFloorY) {
            this.y = targetFloorY;
            if (!this.isGrounded) {
                // Landing squash
                this.squash = 1.3;
                this.stretch = 0.75;
            }
            this.vy = 0;
            this.isGrounded = true;
        }

        // Batas Lapangan Kiri / Kanan
        const minX = this.side === 'left' ? COURT.LEFT_WALL + 20 : COURT.NET_X + COURT.NET_WIDTH / 2 + 20;
        const maxX = this.side === 'left' ? COURT.NET_X - COURT.NET_WIDTH / 2 - 20 : COURT.RIGHT_WALL - 20;

        if (this.x < minX) {
            this.x = minX;
            this.vx = 0;
        }
        if (this.x > maxX) {
            this.x = maxX;
            this.vx = 0;
        }
    }

    // Periksa tumbukan pemain dengan bola
    checkBallHit(ball, onHitCallback) {
        // Tentukan pusat kepala & pusat badan
        const headX = this.x;
        const headY = this.y + this.headRadius;
        const effectiveRadius = this.headRadius + (this.isDiving ? 8 : 0);

        // Hitbox pemain terdiri dari lingkaran atas (kepala/tangan) dan kapsul tubuh
        const dx = ball.x - headX;
        const dy = ball.y - headY;
        const dist = Math.hypot(dx, dy);

        // Jarak jangkauan pukulan (termasuk jangkauan tangan saat smash/dive)
        const hitRange = effectiveRadius + ball.radius + (this.isSpiking ? 18 : 6);

        if (dist < hitRange) {
            // Pemain berhasil menyentuh bola!
            const isSpikeHit = this.isSpiking && (ball.y < this.y + 40);
            const isSuper = isSpikeHit && (this.powerMeter >= 100);

            // Arah pukulan
            let hitAngle;
            let hitPower;

            if (isSpikeHit) {
                // SMASH / SPIKE: Pukulan menukik ke arah lapangan lawan
                const spikeTargetSide = this.side === 'left' ? 1 : -1;
                // Sudut menukik ke bawah (sekitar 35 - 55 derajat ke bawah)
                hitAngle = spikeTargetSide > 0 ? (Math.PI * 0.22) : (Math.PI * 0.78);
                hitPower = (isSuper ? 25.0 : 19.5) * this.powerStat;

                ball.isSuperSpike = isSuper;
                ball.spikePower = isSuper ? 1.5 : 1.2;

                if (isSuper) {
                    this.powerMeter = 0; // Habiskan meter super
                } else {
                    this.powerMeter = Math.min(100, this.powerMeter + 20);
                }

                if (window.soundEngine) window.soundEngine.playSpike(isSuper);
            } else if (this.isDiving) {
                // DIVE SAVE: Pukulan penyelamatan bola rendah mengarah tinggi ke atas
                hitAngle = -Math.PI * 0.5 + (this.facing * 0.2);
                hitPower = 15.5;
                ball.isSuperSpike = false;
                this.powerMeter = Math.min(100, this.powerMeter + 25);
                if (window.soundEngine) window.soundEngine.playBump();
            } else {
                // BUMP / VOLLEY NORMAL: Pantulan parabola ke arah atas dan agak ke depan net
                const normalizedContactX = Math.max(-1, Math.min(1, dx / effectiveRadius));
                // Arah pantul ditentukan posisi sentuh bola pada kepala/tangan
                hitAngle = -Math.PI * 0.5 + (normalizedContactX * 0.65);
                hitPower = 14.5;
                ball.isSuperSpike = false;
                this.powerMeter = Math.min(100, this.powerMeter + 10);
                if (window.soundEngine) window.soundEngine.playBump();
            }

            // Terapkan kecepatan ke bola
            ball.vx = Math.cos(hitAngle) * hitPower;
            ball.vy = Math.sin(hitAngle) * hitPower;

            // Dorong bola sedikit keluar dari hitbox agar tidak tersangkut
            const pushDist = hitRange + 2;
            const normX = dx / (dist || 1);
            const normY = dy / (dist || 1);
            ball.x = headX + normX * pushDist;
            ball.y = headY + normY * pushDist;

            // Update sentuhan dan riwayat pemukul
            ball.lastHitter = this.id;
            this.touchCount++;

            // Trigger visual feedback (partikel, screenshake, floating text)
            if (onHitCallback) {
                onHitCallback({
                    player: this,
                    isSpike: isSpikeHit,
                    isSuper: isSuper,
                    isDive: this.isDiving,
                    hitX: ball.x,
                    hitY: ball.y
                });
            }

            return true;
        }
        return false;
    }
}

window.COURT = COURT;
window.Ball = Ball;
window.Player = Player;
