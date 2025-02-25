/**
 * Multiplayer functionality for Blob Warfare
 */

class MultiplayerManager {
    constructor(game) {
        this.game = game;
        this.playerId = null;
        this.roomId = null;
        this.otherPlayers = {};
        this.isConnected = false;
        this.lastUpdateTime = 0;
        this.updateInterval = 100; // ms between state updates
        this.serverUrl = '/.netlify/functions/game-server';
        this.pingInterval = null;
        this.stateInterval = null;
    }

    async init(nickname, botCount, botDifficulty) {
        try {
            // Create player on the server
            const response = await this.sendRequest('createPlayer', {
                nickname,
                botCount,
                botDifficulty
            });

            if (response && response.playerId) {
                this.playerId = response.playerId;
                console.log(`Connected as player ${nickname} (${this.playerId})`);
                
                // Join a game room
                await this.joinRoom();
                
                // Start update loops
                this.startUpdateLoops();
                
                this.isConnected = true;
                return true;
            }
        } catch (error) {
            console.error('Failed to initialize multiplayer:', error);
        }
        
        return false;
    }

    async joinRoom(roomId = null) {
        try {
            // Always try to join an existing room with players first
            const response = await this.sendRequest('joinRoom', {
                playerId: this.playerId,
                roomId: roomId,
                preferExisting: true  // Signal to server that we prefer existing rooms
            });

            if (response && response.roomId) {
                this.roomId = response.roomId;
                console.log(`Joined room ${this.roomId} with ${response.players.length} players`);
                
                // Initialize other players
                response.players.forEach(player => {
                    if (player.id !== this.playerId) {
                        this.addRemotePlayer(player.id, player.nickname);
                    }
                });
                
                return true;
            }
        } catch (error) {
            console.error('Failed to join room:', error);
        }
        
        return false;
    }

    startUpdateLoops() {
        // Send ping every 15 seconds to keep connection alive
        this.pingInterval = setInterval(() => this.ping(), 15000);
        
        // Update game state every 100ms
        this.stateInterval = setInterval(() => this.updateGameState(), this.updateInterval);
    }

    stopUpdateLoops() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.stateInterval) clearInterval(this.stateInterval);
    }

    async ping() {
        try {
            await this.sendRequest('ping', {});
        } catch (error) {
            console.warn('Ping failed:', error);
        }
    }

    async updateGameState() {
        const now = Date.now();
        
        // Don't update too frequently
        if (now - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        
        this.lastUpdateTime = now;
        
        // Send our player state to the server
        try {
            await this.sendPlayerState();
            
            // Get other players' states
            await this.getGameState();
        } catch (error) {
            console.warn('Failed to update game state:', error);
        }
    }

    async sendPlayerState() {
        if (!this.playerId || !this.roomId || !this.game.player) {
            return;
        }
        
        const playerState = {
            x: this.game.player.x,
            y: this.game.player.y,
            radius: this.game.player.radius,
            score: this.game.player.score,
            color: this.game.player.color,
            towers: this.game.player.towers.map(tower => ({
                type: tower.type,
                level: tower.level,
                x: tower.x,
                y: tower.y
            })),
            isAlive: !this.game.gameOver && this.game.player.radius >= 10
        };
        
        await this.sendRequest('updatePlayerState', {
            playerId: this.playerId,
            roomId: this.roomId,
            playerState
        });
    }

    async getGameState() {
        if (!this.roomId) {
            return;
        }
        
        const response = await this.sendRequest('getGameState', {
            roomId: this.roomId
        });
        
        if (response && response.players) {
            // Update other players
            response.players.forEach(player => {
                if (player.id !== this.playerId && player.state) {
                    if (this.otherPlayers[player.id]) {
                        // Update existing remote player
                        this.updateRemotePlayer(player.id, player.state);
                    } else {
                        // Add new remote player
                        this.addRemotePlayer(player.id, player.nickname);
                    }
                }
            });
            
            // Remove players that are no longer in the game
            const currentPlayerIds = response.players.map(p => p.id);
            Object.keys(this.otherPlayers).forEach(id => {
                if (!currentPlayerIds.includes(id)) {
                    this.removeRemotePlayer(id);
                }
            });
        }
    }

    addRemotePlayer(id, nickname) {
        // Create a remote player representation
        const remotePlayer = {
            id,
            nickname,
            entity: new RemotePlayer(
                this.game.worldWidth / 2, 
                this.game.worldHeight / 2,
                nickname
            ),
            lastUpdated: Date.now()
        };
        
        this.otherPlayers[id] = remotePlayer;
        this.game.remotePlayers.push(remotePlayer.entity);
        
        console.log(`Added remote player: ${nickname}`);
    }

    updateRemotePlayer(id, state) {
        const remotePlayer = this.otherPlayers[id];
        if (!remotePlayer) return;
        
        const entity = remotePlayer.entity;
        
        // Update position and properties
        entity.x = state.x;
        entity.y = state.y;
        entity.radius = state.radius;
        entity.score = state.score;
        
        // Check if player is alive
        if (state.isAlive === false) {
            console.log(`Remote player ${remotePlayer.nickname} is dead`);
            // If the player is dead, make them very small
            entity.radius = 5;
        }
        
        // Log update for debugging
        console.log(`Updated remote player ${remotePlayer.nickname}: x=${entity.x.toFixed(1)}, y=${entity.y.toFixed(1)}, radius=${entity.radius.toFixed(1)}, alive=${state.isAlive}`);
        
        // Update towers if provided
        if (state.towers) {
            // Clear existing towers
            entity.towers = [];
            
            // Add updated towers
            state.towers.forEach(towerData => {
                let tower;
                switch (towerData.type) {
                    case 'basic':
                        tower = new BasicTower(towerData.x, towerData.y);
                        break;
                    case 'fast':
                        tower = new FastTower(towerData.x, towerData.y);
                        break;
                    case 'heavy':
                        tower = new HeavyTower(towerData.x, towerData.y);
                        break;
                }
                
                if (tower) {
                    tower.level = towerData.level;
                    entity.towers.push(tower);
                }
            });
        }
        
        remotePlayer.lastUpdated = Date.now();
    }

    removeRemotePlayer(id) {
        const remotePlayer = this.otherPlayers[id];
        if (!remotePlayer) return;
        
        // Remove from game's remote players array
        const index = this.game.remotePlayers.findIndex(p => p === remotePlayer.entity);
        if (index !== -1) {
            this.game.remotePlayers.splice(index, 1);
        }
        
        // Remove from our tracking
        delete this.otherPlayers[id];
        
        console.log(`Removed remote player: ${remotePlayer.nickname}`);
    }

    async sendRequest(action, data) {
        try {
            const response = await fetch(this.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action,
                    ...data
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Error in ${action} request:`, error);
            throw error;
        }
    }

    disconnect() {
        this.stopUpdateLoops();
        this.isConnected = false;
        this.playerId = null;
        this.roomId = null;
        this.otherPlayers = {};
    }
}

// Remote Player class (represents other players in the game)
class RemotePlayer extends Player {
    constructor(x, y, nickname) {
        super(x, y);
        this.nickname = nickname;
        this.isRemote = true;
        this.color = '#' + Math.floor(Math.random()*16777215).toString(16); // Random color
    }
    
    // Override update to do nothing - position will be set from server updates
    update() {
        // Remote players are updated via the multiplayer manager
    }
    
    draw(ctx) {
        // Draw player with a border to make it more visible
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw player name
        ctx.fillStyle = '#FFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this.nickname, this.x, this.y - this.radius - 5);
        
        // Draw towers
        this.towers.forEach(tower => tower.draw(ctx));
    }
} 