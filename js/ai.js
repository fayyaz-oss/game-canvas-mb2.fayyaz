/**
 * AI Bot Controller for Super Volley Arena
 * Controls Player 2 during Single Player / Solo Mode with 3 difficulty tiers.
 */

class VolleyballAI {
    constructor(player, difficulty = 'normal') {
        this.player = player;
        this.difficulty = difficulty; // 'easy' | 'normal' | 'pro'
        this.targetX = player.x;
        this.reactionDelay = 0;
        this.frameCounter = 0;
    }

    setDifficulty(diff) {
        this.difficulty = diff;
    }

    update(ball) {
        this.frameCounter++;
        const p = this.player;

        // Reset inputs
        p.inputs.left = false;
        p.inputs.right = false;
        p.inputs.up = false;
        p.inputs.down = false;
        p.inputs.spike = false;

        // Parameter berdasarkan tingkat kesulitan
        let reactionRate = 1;
        let predictionAccuracy = 0.85;
        let spikeAggressiveness = 0.5;
        let diveEnabled = false;

        if (this.difficulty === 'easy') {
            reactionRate = 8; // Memperbarui keputusan setiap 8 frame
            predictionAccuracy = 0.65;
            spikeAggressiveness = 0.2;
            diveEnabled = false;
        } else if (this.difficulty === 'normal') {
            reactionRate = 3;
            predictionAccuracy = 0.88;
            spikeAggressiveness = 0.6;
            diveEnabled = true;
        } else if (this.difficulty === 'pro') {
            reactionRate = 1;
            predictionAccuracy = 0.98;
            spikeAggressiveness = 0.9;
            diveEnabled = true;
        }

        // Hitung estimasi posisi pendaratan bola
        if (this.frameCounter % reactionRate === 0) {
            const isBallComingToAiCourt = ball.vx > 0.5 || ball.x > COURT.NET_X - 100;

            if (isBallComingToAiCourt) {
                // Prediksi lintasan parabola bola
                const predictedLandingX = this.predictBallLanding(ball);
                // Tambahkan sedikit variasi human-like error untuk kesulitan rendah
                const errorOffset = (1 - predictionAccuracy) * (Math.sin(this.frameCounter * 0.05) * 80);
                this.targetX = predictedLandingX + errorOffset;

                // Batasi target berada di area lapangan kanan (AI side)
                const minTargetX = COURT.NET_X + COURT.NET_WIDTH + 30;
                const maxTargetX = COURT.RIGHT_WALL - 30;
                this.targetX = Math.max(minTargetX, Math.min(maxTargetX, this.targetX));
            } else {
                // Ketika bola masih di area musuh, kembali ke posisi siap di tengah lapangan AI
                this.targetX = 900;
            }
        }

        // 1. Logika Pergerakan Horizontal (Kiri / Kanan)
        const dx = this.targetX - p.x;
        const moveThreshold = 12;

        if (Math.abs(dx) > moveThreshold) {
            if (dx > 0) {
                p.inputs.right = true;
            } else {
                p.inputs.left = true;
            }
        }

        // 2. Logika Lompat & Smash
        const ballDistX = Math.abs(ball.x - p.x);
        const ballDistY = p.y - ball.y;
        const isBallInMyCourt = ball.x > COURT.NET_X;

        if (isBallInMyCourt) {
            // Evaluasi apakah bola berada pada ketinggian ideal untuk dismash
            const isSpikeOpportunity = ballDistX < 70 && ball.y < COURT.NET_TOP_Y + 70 && ball.y > 180;

            if (isSpikeOpportunity && Math.random() < spikeAggressiveness) {
                if (p.isGrounded) {
                    p.inputs.up = true; // Lompat untuk smash
                } else if (ballDistY > 20 && ballDistY < 80) {
                    // Di udara dan bola tepat di atas kepala -> Eksekusi Spike!
                    p.inputs.spike = true;
                }
            } else if (ballDistX < 50 && ball.y < p.y - 40 && ball.y > p.y - 140 && p.isGrounded) {
                // Lompat untuk sundul / blok atas
                if (Math.random() < 0.6) {
                    p.inputs.up = true;
                }
            }

            // 3. Logika Dive (Penyelamatan Darurat saat bola hampir jatuh dan jauh)
            if (diveEnabled && p.isGrounded && ball.y > COURT.GROUND_Y - 90 && ball.vy > 1) {
                const distanceToBall = Math.abs(ball.x - p.x);
                if (distanceToBall > 60 && distanceToBall < 160) {
                    p.inputs.down = true; // Lakukan diving slide
                }
            }
        }
    }

    // Kalkulasi titik pendaratan bola dengan rumus fisika parabola
    predictBallLanding(ball) {
        let simX = ball.x;
        let simY = ball.y;
        let simVx = ball.vx;
        let simVy = ball.vy;

        // Simulasi ke depan hingga bola mencapai ketinggian kepala pemain
        const targetY = COURT.GROUND_Y - this.player.height;
        let steps = 0;

        while (simY < targetY && steps < 120) {
            simVy += COURT.GRAVITY;
            simVx *= COURT.AIR_DRAG;
            simVy *= COURT.AIR_DRAG;
            simX += simVx;
            simY += simVy;

            // Pantulan dinding kanan jika mengenai dinding dalam lintasan
            if (simX > COURT.RIGHT_WALL - COURT.BALL_RADIUS) {
                simX = COURT.RIGHT_WALL - COURT.BALL_RADIUS;
                simVx = -Math.abs(simVx) * 0.75;
            }
            steps++;
        }

        return simX;
    }
}

window.VolleyballAI = VolleyballAI;
