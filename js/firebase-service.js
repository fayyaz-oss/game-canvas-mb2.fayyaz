/**
 * Firebase Integration Service for Super Volley Arena
 * Cloud Firestore Database & Local Storage Fallback
 */

// Konfigurasi Firebase resmi dari pengguna
const firebaseConfig = {
    apiKey: "AIzaSyDjIceO4fgIfXhHQhuHJo3Vygxk80HKPJw",
    authDomain: "fayyaz-gaming.firebaseapp.com",
    projectId: "fayyaz-gaming",
    storageBucket: "fayyaz-gaming.firebasestorage.app",
    messagingSenderId: "257750340838",
    appId: "1:257750340838:web:6681c2b4318667f6199727"
};

class FirebaseService {
    constructor() {
        this.app = null;
        this.db = null;
        this.isInitialized = false;
        this.status = 'connecting'; // 'connecting' | 'connected' | 'offline'
        this.statusMessage = 'Menghubungkan ke Firebase...';
        this.projectId = firebaseConfig.projectId;

        this.init();
    }

    init() {
        try {
            if (typeof firebase !== 'undefined') {
                // Inisialisasi Firebase App
                if (!firebase.apps.length) {
                    this.app = firebase.initializeApp(firebaseConfig);
                } else {
                    this.app = firebase.app();
                }

                // Inisialisasi Cloud Firestore
                this.db = firebase.firestore();
                this.isInitialized = true;
                this.status = 'connected';
                this.statusMessage = `Terhubung ke Firebase (${firebaseConfig.projectId})`;
                console.log('🔥 [Firebase Connected]:', firebaseConfig.projectId);
            } else {
                console.warn('⚠️ [Firebase] SDK belum tersedia di window. Menunggu CDN...');
                this.status = 'offline';
                this.statusMessage = 'Mode Offline (Local Cache Aktif)';
            }
        } catch (error) {
            console.error('🔥 [Firebase Error]:', error);
            this.status = 'offline';
            this.statusMessage = 'Offline / ' + error.message;
        }

        this.updateUIStatus();
    }

    updateUIStatus() {
        const el = document.getElementById('firebaseConnectionStatus');
        if (el) {
            if (this.status === 'connected') {
                el.innerHTML = `🟢 Firebase: <strong>${this.projectId}</strong> (Aktif)`;
                el.className = 'fb-conn-status connected';
            } else {
                el.innerHTML = `🟡 Firebase: <strong>${this.projectId}</strong> (${this.statusMessage})`;
                el.className = 'fb-conn-status offline';
            }
        }
    }

    /**
     * Simpan Riwayat Pertandingan ke Firestore (koleksi: volley_matches)
     * dan Papan Skor Global (koleksi: volley_leaderboard)
     */
    async saveMatch(matchData) {
        const timestamp = new Date().toISOString();
        const formattedDate = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });

        const matchRecord = {
            winnerName: matchData.winnerName || 'Unknown',
            winnerSide: matchData.winnerSide || 'p1',
            p1Name: matchData.p1Name || 'Player 1',
            p2Name: matchData.p2Name || 'Player 2',
            p1Score: Number(matchData.p1Score) || 0,
            p2Score: Number(matchData.p2Score) || 0,
            longestRally: Number(matchData.longestRally) || 0,
            p1Spikes: Number(matchData.p1Spikes) || 0,
            p2Spikes: Number(matchData.p2Spikes) || 0,
            mode: matchData.mode || 'ai',
            difficulty: matchData.difficulty || 'normal',
            arena: matchData.arena || 'beach',
            targetScore: Number(matchData.targetScore) || 7,
            createdAt: timestamp,
            dateString: formattedDate
        };

        const leaderboardRecord = {
            playerName: matchData.winnerName || 'Player 1',
            longestRally: Number(matchData.longestRally) || 0,
            spikesCount: matchData.winnerSide === 'p1' ? Number(matchData.p1Spikes) : Number(matchData.p2Spikes),
            finalScore: matchData.winnerSide === 'p1' ? Number(matchData.p1Score) : Number(matchData.p2Score),
            opponentScore: matchData.winnerSide === 'p1' ? Number(matchData.p2Score) : Number(matchData.p1Score),
            mode: matchData.mode || 'ai',
            arena: matchData.arena || 'beach',
            difficulty: matchData.difficulty || 'normal',
            createdAt: timestamp,
            dateString: formattedDate
        };

        // Simpan selalu ke LocalStorage sebagai backup instan
        this.saveToLocalStorage(matchRecord, leaderboardRecord);

        // Jika Firebase Firestore aktif, kirim ke Cloud Firestore
        if (this.isInitialized && this.db) {
            try {
                const matchRef = await this.db.collection('volley_matches').add(matchRecord);
                const leadRef = await this.db.collection('volley_leaderboard').add(leaderboardRecord);
                console.log('🔥 [Firebase Cloud] Tersimpan di Firestore ID:', matchRef.id, leadRef.id);
                return { success: true, cloud: true, id: matchRef.id };
            } catch (err) {
                console.warn('⚠️ [Firebase Cloud Sync Notice] Menyimpan di cache lokal karena rule/database belum dibuat di Firebase Console:', err.message);
                return { success: true, cloud: false, localFallback: true, notice: err.message };
            }
        }

        return { success: true, cloud: false, localFallback: true };
    }

    /**
     * Ambil Data Leaderboard (Prioritas Cloud Firestore, fallback LocalStorage)
     */
    async getLeaderboard(sortBy = 'longestRally', maxCount = 10) {
        if (this.isInitialized && this.db) {
            try {
                const snapshot = await this.db.collection('volley_leaderboard')
                    .orderBy(sortBy, 'desc')
                    .limit(maxCount)
                    .get();

                if (!snapshot.empty) {
                    const list = [];
                    snapshot.forEach(doc => {
                        list.push({ id: doc.id, ...doc.data() });
                    });
                    return { success: true, data: list, source: 'cloud' };
                }
            } catch (err) {
                console.warn('⚠️ [Firebase] Fallback ke cache lokal untuk leaderboard:', err.message);
            }
        }

        // Ambil dari local backup jika Firestore belum ada data
        const local = this.getLocalLeaderboard(sortBy, maxCount);
        return { success: true, data: local, source: 'local' };
    }

    /**
     * Ambil Riwayat Pertandingan Terbaru
     */
    async getRecentMatches(maxCount = 8) {
        if (this.isInitialized && this.db) {
            try {
                const snapshot = await this.db.collection('volley_matches')
                    .orderBy('createdAt', 'desc')
                    .limit(maxCount)
                    .get();

                if (!snapshot.empty) {
                    const list = [];
                    snapshot.forEach(doc => {
                        list.push({ id: doc.id, ...doc.data() });
                    });
                    return { success: true, data: list, source: 'cloud' };
                }
            } catch (err) {
                console.warn('⚠️ [Firebase] Fallback ke cache lokal untuk riwayat pertandingan:', err.message);
            }
        }

        const local = this.getLocalMatches(maxCount);
        return { success: true, data: local, source: 'local' };
    }

    // --- Manajemen Penyimpanan Cadangan Lokal ---
    saveToLocalStorage(matchRecord, leaderRecord) {
        try {
            // Simpan riwayat
            const matches = JSON.parse(localStorage.getItem('volley_matches_local') || '[]');
            matches.unshift(matchRecord);
            localStorage.setItem('volley_matches_local', JSON.stringify(matches.slice(0, 30)));

            // Simpan leaderboard
            const leaders = JSON.parse(localStorage.getItem('volley_leader_local') || '[]');
            leaders.push(leaderRecord);
            localStorage.setItem('volley_leader_local', JSON.stringify(leaders.slice(0, 50)));
        } catch (e) {
            console.error('Local storage save error:', e);
        }
    }

    getLocalLeaderboard(sortBy, maxCount) {
        try {
            const list = JSON.parse(localStorage.getItem('volley_leader_local') || '[]');
            list.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
            return list.slice(0, maxCount);
        } catch {
            return [];
        }
    }

    getLocalMatches(maxCount) {
        try {
            const list = JSON.parse(localStorage.getItem('volley_matches_local') || '[]');
            return list.slice(0, maxCount);
        } catch {
            return [];
        }
    }
}

// Pasang ke global window
window.firebaseService = new FirebaseService();
