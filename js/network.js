/**
 * P2P WebRTC Multiplayer Network Manager using PeerJS
 * Allows two players on different browsers or devices to connect via a simple room code.
 */

class NetworkManager {
    constructor(game) {
        this.game = game;
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.isConnected = false;
        this.roomCode = null;
        this.lastPingTime = 0;
        this.ping = 0;
        this.onStatusChange = null;
    }

    setStatus(text, type = 'info') {
        console.log(`[Network ${type}]`, text);
        if (this.onStatusChange) {
            this.onStatusChange(text, type);
        }
    }

    // Buat Room Baru sebagai Host
    createRoom(callback) {
        this.cleanup();
        this.isHost = true;

        if (typeof Peer === 'undefined') {
            this.setStatus('PeerJS library belum dimuat. Pastikan koneksi internet aktif.', 'error');
            return;
        }

        // Buat ID room acak yang mudah diketik (4 karakter)
        const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const peerId = `VOLLEY-${randomCode}`;
        this.roomCode = randomCode;

        this.setStatus('Menghubungkan ke server P2P...', 'info');

        try {
            this.peer = new Peer(peerId, {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                this.setStatus(`Room Berhasil Dibuat! Kode Room: ${this.roomCode}`, 'success');
                if (callback) callback(this.roomCode);
            });

            this.peer.on('connection', (connection) => {
                this.handleConnection(connection);
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                if (err.type === 'unavailable-id') {
                    // Coba lagi dengan ID baru jika kebetulan tabrakan
                    this.createRoom(callback);
                } else {
                    this.setStatus(`Error P2P: ${err.type || err.message}`, 'error');
                }
            });
        } catch (e) {
            this.setStatus('Gagal menginisialisasi WebRTC Peer.', 'error');
        }
    }

    // Bergabung ke Room yang Ada sebagai Guest
    joinRoom(roomCode, callback) {
        this.cleanup();
        this.isHost = false;
        this.roomCode = roomCode.trim().toUpperCase();

        if (typeof Peer === 'undefined') {
            this.setStatus('PeerJS library belum dimuat. Periksa koneksi internet.', 'error');
            return;
        }

        const targetPeerId = `VOLLEY-${this.roomCode}`;
        this.setStatus(`Menghubungkan ke Room ${this.roomCode}...`, 'info');

        try {
            this.peer = new Peer({
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            this.peer.on('open', (myId) => {
                const connection = this.peer.connect(targetPeerId, {
                    reliable: true
                });
                this.handleConnection(connection, callback);
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                this.setStatus(`Tidak dapat menemukan room: ${this.roomCode}`, 'error');
            });
        } catch (e) {
            this.setStatus('Gagal memulai koneksi P2P.', 'error');
        }
    }

    handleConnection(connection, onConnected) {
        this.conn = connection;

        this.conn.on('open', () => {
            this.isConnected = true;
            this.setStatus(this.isHost ? 'Lawan bergabung! Permainan dimulai.' : 'Terhubung ke Host! Siap main.', 'success');

            // Mulai interval ping
            this.startPingInterval();

            if (this.game && this.game.onMultiplayerConnect) {
                this.game.onMultiplayerConnect(this.isHost);
            }

            if (onConnected) onConnected();
        });

        this.conn.on('data', (data) => {
            this.handleIncomingData(data);
        });

        this.conn.on('close', () => {
            this.isConnected = false;
            this.setStatus('Koneksi terputus dengan lawan main.', 'warning');
            if (this.game && this.game.onMultiplayerDisconnect) {
                this.game.onMultiplayerDisconnect();
            }
        });

        this.conn.on('error', (err) => {
            console.error('Connection error:', err);
            this.setStatus('Terjadi gangguan jaringan antar pemain.', 'error');
        });
    }

    startPingInterval() {
        setInterval(() => {
            if (this.isConnected && this.conn) {
                this.lastPingTime = Date.now();
                this.send({ type: 'PING', time: this.lastPingTime });
            }
        }, 3000);
    }

    send(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }

    // Host menyiarkan state fisika permainan ke Guest
    broadcastGameState(state) {
        if (!this.isHost || !this.isConnected) return;
        this.send({
            type: 'GAME_STATE',
            payload: state
        });
    }

    // Guest mengirim input tombol ke Host
    sendGuestInput(inputs) {
        if (this.isHost || !this.isConnected) return;
        this.send({
            type: 'PLAYER_INPUT',
            inputs: inputs
        });
    }

    handleIncomingData(data) {
        if (!data || !data.type) return;

        switch (data.type) {
            case 'PING':
                this.send({ type: 'PONG', time: data.time });
                break;

            case 'PONG':
                this.ping = Math.round((Date.now() - data.time) / 2);
                break;

            case 'PLAYER_INPUT':
                // Diterima oleh Host dari Player 2 (Guest)
                if (this.isHost && this.game && this.game.player2) {
                    this.game.player2.inputs = { ...data.inputs };
                }
                break;

            case 'GAME_STATE':
                // Diterima oleh Guest dari Host
                if (!this.isHost && this.game && this.game.applyHostGameState) {
                    this.game.applyHostGameState(data.payload);
                }
                break;

            case 'EFFECT_TRIGGER':
                if (this.game && this.game.triggerVisualEffect) {
                    this.game.triggerVisualEffect(data.effect);
                }
                break;
        }
    }

    cleanup() {
        if (this.conn) {
            try { this.conn.close(); } catch (e) {}
            this.conn = null;
        }
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
        }
        this.isConnected = false;
        this.roomCode = null;
    }
}

window.NetworkManager = NetworkManager;
