/**
 * Main Game Controller for Super Volley Arena
 * Manages game state, scores, user input, sound, AI, and network events.
 */

class VolleyballGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.canvas.width = COURT.WIDTH;
        this.canvas.height = COURT.HEIGHT;

        this.renderer = new GameRenderer(this.canvas);
        this.ball = new Ball();

        // Pemain 1 & Pemain 2
        this.player1 = new Player('p1', 'left', {
            name: 'Player 1',
            color: '#FF4757',
            accent: '#FFFFFF',
            speed: 7.2,
            jump: -14.6,
            power: 1.0
        });

        this.player2 = new Player('p2', 'right', {
            name: 'Player 2',
            color: '#1E90FF',
            accent: '#FFD700',
            speed: 7.2,
            jump: -14.6,
            power: 1.0
        });

        // Mode Game: 'ai' | 'local' | 'online'
        this.mode = 'ai';
        this.selectedArena = 'beach';
        this.selectedDifficulty = 'normal';
        this.ai = new VolleyballAI(this.player2, 'normal');
        this.network = new NetworkManager(this);

        // Aturan Skor
        this.score = { p1: 0, p2: 0 };
        this.targetScore = 7; // Poin kemenangan (bisa 5, 7, 11, 21)
        this.servingPlayer = 'p1';

        // State Mesin Game
        this.state = 'MENU'; // 'MENU' | 'COUNTDOWN' | 'PLAYING' | 'POINT_SCORED' | 'GAME_OVER' | 'PAUSED'
        this.countdownTimer = 0;
        this.pointScoredTimer = 0;
        this.rallyHits = 0;
        this.stats = {
            longestRally: 0,
            p1Spikes: 0,
            p2Spikes: 0
        };

        // Input listeners
        this.activeKeys = new Set();
        this.setupKeyboardListeners();

        // Game loop
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    setMode(mode) {
        this.mode = mode;
        if (mode === 'ai') {
            this.player2.name = 'Bot AI';
        } else if (mode === 'local') {
            this.player2.name = 'Player 2';
        } else if (mode === 'online') {
            this.player2.name = this.network.isHost ? 'Guest' : 'Host';
        }
    }

    setDifficulty(diff) {
        this.selectedDifficulty = diff;
        if (this.ai) {
            this.ai.setDifficulty(diff);
        }
    }

    setArena(theme) {
        this.selectedArena = theme;
        this.renderer.setTheme(theme);
    }

    setTargetScore(pts) {
        this.targetScore = pts;
    }

    startMatch() {
        this.score = { p1: 0, p2: 0 };
        this.rallyHits = 0;
        this.stats.longestRally = 0;
        this.stats.p1Spikes = 0;
        this.stats.p2Spikes = 0;
        this.servingPlayer = Math.random() > 0.5 ? 'p1' : 'p2';

        this.updateScoreboardUI();
        this.startServeCountdown();
    }

    startServeCountdown() {
        this.state = 'COUNTDOWN';
        this.countdownTimer = 90; // 1.5 detik (60fps)

        this.player1.resetPosition();
        this.player2.resetPosition();

        // Posisi bola sebelum serve dipegang oleh server
        const serveX = this.servingPlayer === 'p1' ? 240 : 960;
        const serveY = 280;
        this.ball.reset(serveX, serveY, 0, 0);

        if (window.soundEngine) {
            window.soundEngine.playWhistle();
        }
    }

    serveBall() {
        this.state = 'PLAYING';
        this.rallyHits = 0;

        // Lontarkan bola melengkung ke atas
        const serveVx = this.servingPlayer === 'p1' ? 3.5 : -3.5;
        this.ball.reset(this.ball.x, this.ball.y, serveVx, -9.5);

        this.renderer.addFloatingText('SERVE!', this.ball.x, this.ball.y - 30, '#FFD700', 30);
    }

    loop(currentTime) {
        requestAnimationFrame((t) => this.loop(t));

        // Update logika permainan
        this.update();

        // Render frame
        this.renderer.render(this.ball, this.player1, this.player2, this.state);
    }

    update() {
        if (this.state === 'PAUSED' || this.state === 'MENU') return;

        // 1. Tangani countdown sebelum serve
        if (this.state === 'COUNTDOWN') {
            this.countdownTimer--;
            if (this.countdownTimer <= 0) {
                this.serveBall();
            }
            return;
        }

        // 2. Tangani jeda perolehan poin
        if (this.state === 'POINT_SCORED') {
            this.pointScoredTimer--;
            if (this.pointScoredTimer <= 0) {
                // Periksa apakah pertandingan berakhir
                if (this.checkMatchWin()) {
                    this.triggerGameOver();
                } else {
                    this.startServeCountdown();
                }
            }
            return;
        }

        if (this.state !== 'PLAYING') return;

        // 3. Proses input pemain lokal & AI
        this.processInputs();

        // 4. Update fisik pemain
        this.player1.update();
        this.player2.update();

        // 5. Update fisik bola
        this.ball.update();

        // 6. Cek tumbukan pemain dengan bola
        this.player1.checkBallHit(this.ball, (hit) => this.onPlayerHit(hit));
        this.player2.checkBallHit(this.ball, (hit) => this.onPlayerHit(hit));

        // 7. Cek apakah bola menyentuh lantai (Point Scored!)
        if (this.ball.groundHit) {
            this.handleGroundHit();
        }

        // 8. Sinkronisasi jaringan jika mode Online Multiplayer
        if (this.mode === 'online') {
            if (this.network.isHost) {
                // Host broadcast game state
                this.network.broadcastGameState({
                    ball: {
                        x: this.ball.x,
                        y: this.ball.y,
                        vx: this.ball.vx,
                        vy: this.ball.vy,
                        rot: this.ball.rotation,
                        isSuper: this.ball.isSuperSpike
                    },
                    p1: {
                        x: this.player1.x,
                        y: this.player1.y,
                        vx: this.player1.vx,
                        vy: this.player1.vy,
                        isGrounded: this.player1.isGrounded,
                        isDiving: this.player1.isDiving,
                        isSpiking: this.player1.isSpiking,
                        powerMeter: this.player1.powerMeter,
                        facing: this.player1.facing
                    },
                    score: this.score,
                    state: this.state
                });
            } else {
                // Guest kirim input ke Host
                this.network.sendGuestInput(this.player2.inputs);
            }
        }

        // Update UI HUD Power Meters
        this.updateHUDMeters();
    }

    processInputs() {
        // Mode 1: Player 1 (WASD + Space)
        if (this.mode !== 'online' || this.network.isHost) {
            this.player1.inputs.left = this.activeKeys.has('KeyA') || this.activeKeys.has('Keya');
            this.player1.inputs.right = this.activeKeys.has('KeyD') || this.activeKeys.has('Keyd');
            this.player1.inputs.up = this.activeKeys.has('KeyW') || this.activeKeys.has('Keyw');
            this.player1.inputs.down = this.activeKeys.has('KeyS') || this.activeKeys.has('Keys');
            this.player1.inputs.spike = this.activeKeys.has('Space');
        }

        // Mode 2: Player 2
        if (this.mode === 'ai') {
            this.ai.update(this.ball);
        } else if (this.mode === 'local') {
            // Local 2 Player: Arrow Keys + Enter
            this.player2.inputs.left = this.activeKeys.has('ArrowLeft');
            this.player2.inputs.right = this.activeKeys.has('ArrowRight');
            this.player2.inputs.up = this.activeKeys.has('ArrowUp');
            this.player2.inputs.down = this.activeKeys.has('ArrowDown');
            this.player2.inputs.spike = this.activeKeys.has('Enter') || this.activeKeys.has('Numpad0');
        } else if (this.mode === 'online' && !this.network.isHost) {
            // Guest mengontrol Player 2 dengan WASD atau Arrow Keys
            this.player2.inputs.left = this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft');
            this.player2.inputs.right = this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight');
            this.player2.inputs.up = this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp');
            this.player2.inputs.down = this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown');
            this.player2.inputs.spike = this.activeKeys.has('Space') || this.activeKeys.has('Enter');
        }
    }

    onPlayerHit(hit) {
        this.rallyHits++;
        if (this.rallyHits > this.stats.longestRally) {
            this.stats.longestRally = this.rallyHits;
        }

        // Efek visual & teks sesuai jenis pukulan
        if (hit.isSuper) {
            this.renderer.triggerScreenShake(20);
            this.renderer.addHitSparks(hit.hitX, hit.hitY, true, '#FF4500');
            this.renderer.addFloatingText('SUPER SMASH!!', hit.hitX, hit.hitY - 40, '#FF4757', 32);
            if (hit.player.id === 'p1') this.stats.p1Spikes++;
            else this.stats.p2Spikes++;
        } else if (hit.isSpike) {
            this.renderer.triggerScreenShake(10);
            this.renderer.addHitSparks(hit.hitX, hit.hitY, false, '#FFD700');
            this.renderer.addFloatingText('SPIKE!', hit.hitX, hit.hitY - 30, '#FFA502', 26);
            if (hit.player.id === 'p1') this.stats.p1Spikes++;
            else this.stats.p2Spikes++;
        } else if (hit.isDive) {
            this.renderer.addHitSparks(hit.hitX, hit.hitY, false, '#2ED573');
            this.renderer.addFloatingText('GREAT SAVE!', hit.hitX, hit.hitY - 30, '#2ED573', 24);
        } else {
            this.renderer.addHitSparks(hit.hitX, hit.hitY, false, '#FFFFFF');
            if (this.rallyHits > 5 && this.rallyHits % 4 === 0) {
                this.renderer.addFloatingText(`${this.rallyHits} RALLY!`, COURT.NET_X, 180, '#00F0FF', 26);
            }
        }
    }

    handleGroundHit() {
        this.state = 'POINT_SCORED';
        this.pointScoredTimer = 80;

        let scoringPlayer;
        let announcement;

        // Aturan poin voli: jika bola jatuh di lapangan kiri, poin untuk Player 2
        // Jika bola jatuh di lapangan kanan, poin untuk Player 1
        if (this.ball.groundHitSide === 'left') {
            this.score.p2++;
            scoringPlayer = this.player2;
            this.servingPlayer = 'p2';
            announcement = `${this.player2.name} SCORES!`;
        } else {
            this.score.p1++;
            scoringPlayer = this.player1;
            this.servingPlayer = 'p1';
            announcement = `${this.player1.name} SCORES!`;
        }

        if (window.soundEngine) {
            window.soundEngine.playPointScore();
            window.soundEngine.playCheer();
        }

        this.renderer.addFloatingText(announcement, COURT.WIDTH / 2, 220, scoringPlayer.color, 36);
        this.updateScoreboardUI();
    }

    checkMatchWin() {
        const s1 = this.score.p1;
        const s2 = this.score.p2;
        const target = this.targetScore;

        // Syarat menang: mencapai target poin DAN unggul minimal 2 poin (Deuce rule)
        if (s1 >= target && s1 - s2 >= 2) {
            this.matchWinner = this.player1;
            return true;
        }
        if (s2 >= target && s2 - s1 >= 2) {
            this.matchWinner = this.player2;
            return true;
        }

        // Cek pemberitahuan Deuce atau Match Point
        if (s1 >= target - 1 && s2 >= target - 1 && s1 === s2) {
            this.renderer.addFloatingText('DEUCE!', COURT.WIDTH / 2, 260, '#FF4757', 38);
        } else if ((s1 >= target - 1 && s1 > s2) || (s2 >= target - 1 && s2 > s1)) {
            this.renderer.addFloatingText('MATCH POINT!', COURT.WIDTH / 2, 260, '#FFD700', 38);
        }

        return false;
    }

    triggerGameOver() {
        this.state = 'GAME_OVER';
        this.renderer.addConfetti();
        if (window.soundEngine) {
            window.soundEngine.playVictory();
        }

        // Tampilkan modal Game Over dengan statistik
        const modal = document.getElementById('gameOverModal');
        const winnerNameEl = document.getElementById('winnerName');
        const statsEl = document.getElementById('gameOverStats');
        const fbBadgeEl = document.getElementById('firebaseStatusBadge');

        if (winnerNameEl) {
            winnerNameEl.textContent = `${this.matchWinner.name} WINS!`;
            winnerNameEl.style.color = this.matchWinner.color;
        }

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="stat-row"><span>Final Score:</span> <strong>${this.score.p1} - ${this.score.p2}</strong></div>
                <div class="stat-row"><span>Longest Rally:</span> <strong>${this.stats.longestRally} hits</strong></div>
                <div class="stat-row"><span>P1 Spikes:</span> <strong>${this.stats.p1Spikes}</strong></div>
                <div class="stat-row"><span>P2 Spikes:</span> <strong>${this.stats.p2Spikes}</strong></div>
            `;
        }

        if (modal) modal.classList.remove('hidden');

        // Hubungkan ke Firebase Cloud Firestore
        if (fbBadgeEl) {
            fbBadgeEl.textContent = '☁️ Menyimpan ke Cloud Firebase...';
            fbBadgeEl.className = 'fb-badge saving';
        }

        if (window.firebaseService && window.firebaseService.isInitialized) {
            const matchRecord = {
                winnerName: this.matchWinner ? this.matchWinner.name : 'Unknown',
                winnerSide: this.matchWinner ? this.matchWinner.id : 'p1',
                p1Name: this.player1.name,
                p2Name: this.player2.name,
                p1Score: this.score.p1,
                p2Score: this.score.p2,
                longestRally: this.stats.longestRally,
                p1Spikes: this.stats.p1Spikes,
                p2Spikes: this.stats.p2Spikes,
                mode: this.mode,
                difficulty: this.mode === 'ai' ? (this.ai ? this.ai.difficulty : 'normal') : '-',
                arena: this.selectedArena || (this.renderer ? this.renderer.themeName : 'beach'),
                targetScore: this.targetScore
            };

            window.firebaseService.saveMatch(matchRecord)
                .then(res => {
                    if (fbBadgeEl) {
                        if (res && res.success) {
                            fbBadgeEl.textContent = '✅ Berhasil disimpan ke Firebase Cloud!';
                            fbBadgeEl.className = 'fb-badge saved';
                        } else {
                            fbBadgeEl.textContent = '⚠️ ' + (res.error || 'Gagal menyimpan ke Firebase');
                            fbBadgeEl.className = 'fb-badge error';
                        }
                    }
                })
                .catch(err => {
                    console.error('Firebase save error:', err);
                    if (fbBadgeEl) {
                        fbBadgeEl.textContent = '⚠️ Error koneksi Firebase';
                        fbBadgeEl.className = 'fb-badge error';
                    }
                });
        } else if (fbBadgeEl) {
            fbBadgeEl.textContent = '⚡ Mode Offline (Firebase tidak aktif)';
            fbBadgeEl.className = 'fb-badge offline';
        }
    }

    updateScoreboardUI() {
        const p1ScoreEl = document.getElementById('p1ScoreDisplay');
        const p2ScoreEl = document.getElementById('p2ScoreDisplay');
        const p1NameEl = document.getElementById('p1NameDisplay');
        const p2NameEl = document.getElementById('p2NameDisplay');
        const serverBadgeP1 = document.getElementById('p1ServerBadge');
        const serverBadgeP2 = document.getElementById('p2ServerBadge');

        if (p1ScoreEl) p1ScoreEl.textContent = this.score.p1;
        if (p2ScoreEl) p2ScoreEl.textContent = this.score.p2;
        if (p1NameEl) p1NameEl.textContent = this.player1.name;
        if (p2NameEl) p2NameEl.textContent = this.player2.name;

        if (serverBadgeP1) serverBadgeP1.style.display = this.servingPlayer === 'p1' ? 'inline-block' : 'none';
        if (serverBadgeP2) serverBadgeP2.style.display = this.servingPlayer === 'p2' ? 'inline-block' : 'none';
    }

    updateHUDMeters() {
        const p1Meter = document.getElementById('p1PowerFill');
        const p2Meter = document.getElementById('p2PowerFill');

        if (p1Meter) {
            p1Meter.style.width = `${this.player1.powerMeter}%`;
            if (this.player1.powerMeter >= 100) p1Meter.classList.add('ready');
            else p1Meter.classList.remove('ready');
        }

        if (p2Meter) {
            p2Meter.style.width = `${this.player2.powerMeter}%`;
            if (this.player2.powerMeter >= 100) p2Meter.classList.add('ready');
            else p2Meter.classList.remove('ready');
        }
    }

    // Menerima state dari Host (untuk mode Online Multiplayer Guest)
    applyHostGameState(state) {
        if (!state) return;
        this.ball.x = state.ball.x;
        this.ball.y = state.ball.y;
        this.ball.vx = state.ball.vx;
        this.ball.vy = state.ball.vy;
        this.ball.rotation = state.ball.rot;
        this.ball.isSuperSpike = state.ball.isSuper;

        this.player1.x = state.p1.x;
        this.player1.y = state.p1.y;
        this.player1.isGrounded = state.p1.isGrounded;
        this.player1.isDiving = state.p1.isDiving;
        this.player1.isSpiking = state.p1.isSpiking;
        this.player1.powerMeter = state.p1.powerMeter;
        this.player1.facing = state.p1.facing;

        this.score = state.score;
        this.state = state.state;
        this.updateScoreboardUI();
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            // Aktifkan audio context pada interaksi pertama user
            if (window.soundEngine) window.soundEngine.resume();

            // Mencegah scroll default untuk panah dan spasi
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            this.activeKeys.add(e.code);
            this.activeKeys.add(e.key);
        });

        window.addEventListener('keyup', (e) => {
            this.activeKeys.delete(e.code);
            this.activeKeys.delete(e.key);
        });
    }

    // Callback event multiplayer
    onMultiplayerConnect(isHost) {
        this.setMode('online');
        document.getElementById('multiplayerModal').classList.add('hidden');
        document.getElementById('mainMenuOverlay').classList.add('hidden');
        this.startMatch();
    }

    onMultiplayerDisconnect() {
        this.renderer.addFloatingText('Lawan Terputus!', COURT.WIDTH / 2, 260, '#FF4757', 34);
    }
}

window.VolleyballGame = VolleyballGame;
