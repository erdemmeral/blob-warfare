/**
 * Main game logic
 */

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.player = null;
        this.bots = [];
        this.remotePlayers = []; // Players from multiplayer
        this.enemies = [];
        this.projectiles = [];
        this.food = [];
        this.score = 0;
        this.gameOver = false;
        this.lastEnemySpawnTime = 0;
        this.enemySpawnRate = 3000;
        this.lastFoodSpawnTime = 0;
        this.foodSpawnRate = 1000; // ms between food spawns
        this.mousePosition = { x: 0, y: 0 };
        this.worldWidth = window.isMobile ? 1500 : 2000;
        this.worldHeight = window.isMobile ? 1500 : 2000;
        this.camera = { x: 0, y: 0 };
        this.botCount = window.botCount || 3;
        this.botDifficulty = window.botDifficulty || 'medium';
        this.botNames = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet'];
        this.botColors = ['#FF5722', '#9C27B0', '#3F51B5', '#03A9F4', '#009688', '#8BC34A', '#FFEB3B', '#FF9800', '#795548', '#607D8B'];
        this.multiplayerEnabled = false;
        this.multiplayer = null;
        this.isMobile = window.isMobile || false;
        
        // Initialize game
        this.init();
    }

    init() {
        // Resize canvas to fill window
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Create player at center of world
        this.player = new Player(this.worldWidth / 2, this.worldHeight / 2);
        
        // Set player name from the prompt
        this.playerName = window.playerName || "Player";
        
        // Initialize multiplayer if enabled
        if (window.enableMultiplayer) {
            this.initMultiplayer();
        } else {
            // Create bots for single player mode
            this.createBots();
        }
        
        // Track mouse position
        window.addEventListener('mousemove', (e) => {
            this.mousePosition.x = e.clientX + this.camera.x;
            this.mousePosition.y = e.clientY + this.camera.y;
        });
        
        // Add touch support for mobile devices
        window.addEventListener('touchmove', (e) => {
            // Prevent default to stop scrolling
            e.preventDefault();
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                this.mousePosition.x = touch.clientX + this.camera.x;
                this.mousePosition.y = touch.clientY + this.camera.y;
            }
        }, { passive: false });
        
        // Tower placement
        document.getElementById('basicTower').addEventListener('click', () => this.placeTower('basic'));
        document.getElementById('fastTower').addEventListener('click', () => this.placeTower('fast'));
        document.getElementById('heavyTower').addEventListener('click', () => this.placeTower('heavy'));
        
        // Update button text to show shortcuts
        document.getElementById('basicTower').innerHTML = 'Basic Tower (10)<br><small>Key: 1</small>';
        document.getElementById('fastTower').innerHTML = 'Fast Tower (25)<br><small>Key: 2</small>';
        document.getElementById('heavyTower').innerHTML = 'Heavy Tower (50)<br><small>Key: 3</small>';
        
        // Keyboard shortcuts for towers
        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case '1':
                    this.placeTower('basic');
                    break;
                case '2':
                    this.placeTower('fast');
                    break;
                case '3':
                    this.placeTower('heavy');
                    break;
            }
        });
        
        // Restart game
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
    }

    async initMultiplayer() {
        this.multiplayerEnabled = true;
        this.multiplayer = new MultiplayerManager(this);
        
        const success = await this.multiplayer.init(
            this.playerName, 
            this.botCount, 
            this.botDifficulty
        );
        
        if (success) {
            // Adjust bot count based on player count in the room
            if (this.multiplayer.otherPlayers) {
                const playerCount = 1 + Object.keys(this.multiplayer.otherPlayers).length;
                // Match bots to player count, with a minimum of 2 bots
                this.botCount = Math.max(2, playerCount);
                console.log(`Adjusted bot count to match player count: ${this.botCount}`);
            }
            
            // Create bots for multiplayer mode
            this.createBots();
        } else {
            console.error('Failed to initialize multiplayer, falling back to single player');
            this.multiplayerEnabled = false;
            this.createBots();
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    placeTower(type) {
        let baseCost;
        switch (type) {
            case 'basic': baseCost = 10; break;
            case 'fast': baseCost = 25; break;
            case 'heavy': baseCost = 50; break;
        }
        
        // Calculate cost based on current level
        const currentLevel = this.player.towerLevels[type];
        const cost = currentLevel === 0 ? baseCost : Math.floor(baseCost * (1 + 0.5 * currentLevel));
        
        if (this.player.score >= cost) {
            this.player.addTower(type);
            this.player.score -= cost;
            this.updateScore();
            
            // Update button text to show next upgrade cost
            const nextLevel = this.player.towerLevels[type];
            const nextCost = Math.floor(baseCost * (1 + 0.5 * nextLevel));
            const buttonId = type + 'Tower';
            const keyNumber = type === 'basic' ? '1' : (type === 'fast' ? '2' : '3');
            const buttonText = type.charAt(0).toUpperCase() + type.slice(1) + ' Tower (' + nextCost + ')<br><small>Key: ' + keyNumber + '</small>';
            document.getElementById(buttonId).innerHTML = buttonText;
        }
    }

    spawnEnemy(currentTime) {
        if (currentTime - this.lastEnemySpawnTime > this.enemySpawnRate) {
            this.lastEnemySpawnTime = currentTime;
            
            // Spawn enemy outside of view
            let x, y;
            const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
            
            switch (side) {
                case 0: // top
                    x = random(0, this.worldWidth);
                    y = -50;
                    break;
                case 1: // right
                    x = this.worldWidth + 50;
                    y = random(0, this.worldHeight);
                    break;
                case 2: // bottom
                    x = random(0, this.worldWidth);
                    y = this.worldHeight + 50;
                    break;
                case 3: // left
                    x = -50;
                    y = random(0, this.worldHeight);
                    break;
            }
            
            // Random size and speed (bigger = slower)
            const radius = random(15, 40);
            const speed = 3 - (radius - 15) / 25 * 2; // Speed between 1-3 based on size
            const value = Math.floor(radius * 2);
            
            this.enemies.push(new Enemy(x, y, radius, speed, value));
            
            // Increase spawn rate as game progresses (more slowly)
            this.enemySpawnRate = Math.max(1000, this.enemySpawnRate - 5); // Changed from 500 to 1000 minimum, and from -10 to -5
        }
    }

    spawnFood(currentTime) {
        if (currentTime - this.lastFoodSpawnTime > this.foodSpawnRate) {
            this.lastFoodSpawnTime = currentTime;
            
            // Spawn food randomly in the world
            const x = random(50, this.worldWidth - 50);
            const y = random(50, this.worldHeight - 50);
            
            this.food.push(new Food(x, y));
        }
    }

    updateCamera() {
        // Center camera on player
        this.camera.x = this.player.x - this.width / 2;
        this.camera.y = this.player.y - this.height / 2;
        
        // Clamp camera to world bounds
        this.camera.x = clamp(this.camera.x, 0, this.worldWidth - this.width);
        this.camera.y = clamp(this.camera.y, 0, this.worldHeight - this.height);
    }

    update(currentTime) {
        if (this.gameOver) return;
        
        // Spawn entities
        this.spawnEnemy(currentTime);
        this.spawnFood(currentTime);
        
        // Update player
        this.player.update(
            this.mousePosition.x, 
            this.mousePosition.y, 
            this.worldWidth, 
            this.worldHeight
        );
        
        // Update tower sizes based on player size
        this.updateTowerSizes();
        
        // Update bots
        const allPlayers = [this.player, ...this.bots, ...this.remotePlayers];
        this.bots.forEach(bot => {
            bot.update(this.worldWidth, this.worldHeight, this.food, this.enemies, allPlayers, currentTime);
            
            // Check bot collision with food
            this.food.forEach(food => {
                if (circleCollision(
                    bot.x, bot.y, bot.radius,
                    food.x, food.y, food.radius
                )) {
                    // Collect food
                    bot.score += food.value;
                    bot.radius += 0.2;
                    bot.updateSpeed();
                    food.markedForDeletion = true;
                }
            });
            
            // Check bot collision with enemies
            this.enemies.forEach(enemy => {
                if (circleCollision(
                    bot.x, bot.y, bot.radius,
                    enemy.x, enemy.y, enemy.radius
                )) {
                    // If bot is bigger, eat the enemy
                    if (bot.radius > enemy.radius * 1.2) {
                        bot.score += enemy.value;
                        bot.radius += enemy.radius * 0.2;
                        bot.updateSpeed();
                        enemy.markedForDeletion = true;
                    }
                }
            });
            
            // Check bot collision with player
            if (circleCollision(
                this.player.x, this.player.y, this.player.radius,
                bot.x, bot.y, bot.radius
            )) {
                if (this.player.radius > bot.radius * 1.2) {
                    // Player eats bot
                    this.player.score += Math.floor(bot.score);
                    this.player.radius += bot.radius * 0.2;
                    this.player.updateSpeed();
                    this.updateScore();
                    bot.markedForDeletion = true;
                } else if (bot.radius > this.player.radius * 1.2) {
                    // Bot eats player
                    this.endGame();
                }
            }
            
            // Check bot collision with remote players
            this.remotePlayers.forEach(remotePlayer => {
                if (circleCollision(
                    remotePlayer.x, remotePlayer.y, remotePlayer.radius,
                    bot.x, bot.y, bot.radius
                )) {
                    if (remotePlayer.radius > bot.radius * 1.2) {
                        // Remote player eats bot
                        bot.markedForDeletion = true;
                    } else if (bot.radius > remotePlayer.radius * 1.2) {
                        // Bot eats remote player
                        bot.score += Math.floor(remotePlayer.score || 0);
                        bot.radius += remotePlayer.radius * 0.2;
                        bot.updateSpeed();
                    }
                }
            });
            
            // Check bot collision with other bots
            this.bots.forEach(otherBot => {
                if (bot !== otherBot && circleCollision(
                    bot.x, bot.y, bot.radius,
                    otherBot.x, otherBot.y, otherBot.radius
                )) {
                    if (bot.radius > otherBot.radius * 1.2) {
                        // This bot eats the other bot
                        bot.score += Math.floor(otherBot.score);
                        bot.radius += otherBot.radius * 0.2;
                        bot.updateSpeed();
                        otherBot.markedForDeletion = true;
                    }
                }
            });
            
            // Fire bot towers
            bot.towers.forEach(tower => {
                if (tower.canFire(currentTime)) {
                    // Find targets - can be enemies or players
                    const target = this.findTowerTarget(tower, bot, allPlayers);
                    if (target) {
                        const projectile = tower.fire(currentTime, target.x, target.y);
                        projectile.owner = bot; // Track who fired this projectile
                        this.projectiles.push(projectile);
                    }
                }
            });
        });
        
        // Update remote players (minimal updates as they're controlled by the server)
        this.remotePlayers.forEach(remotePlayer => {
            // Check remote player collision with food
            this.food.forEach(food => {
                if (circleCollision(
                    remotePlayer.x, remotePlayer.y, remotePlayer.radius,
                    food.x, food.y, food.radius
                )) {
                    // Mark food for deletion
                    food.markedForDeletion = true;
                }
            });
            
            // Check remote player collision with player
            if (circleCollision(
                this.player.x, this.player.y, this.player.radius,
                remotePlayer.x, remotePlayer.y, remotePlayer.radius
            )) {
                if (this.player.radius > remotePlayer.radius * 1.2) {
                    // Player eats remote player
                    this.player.score += Math.floor(remotePlayer.score || 0);
                    this.player.radius += remotePlayer.radius * 0.2;
                    this.player.updateSpeed();
                    this.updateScore();
                } else if (remotePlayer.radius > this.player.radius * 1.2) {
                    // Remote player eats player
                    this.endGame();
                }
            }
            
            // Fire remote player towers
            remotePlayer.towers.forEach(tower => {
                if (tower.canFire(currentTime)) {
                    // Find targets - can be enemies or players
                    const target = this.findTowerTarget(tower, remotePlayer, allPlayers);
                    if (target) {
                        const projectile = tower.fire(currentTime, target.x, target.y);
                        projectile.owner = remotePlayer; // Track who fired this projectile
                        this.projectiles.push(projectile);
                    }
                }
            });
        });
        
        // Update camera
        this.updateCamera();
        
        // Update enemies
        this.enemies.forEach(enemy => {
            // Find closest player (including bots and remote players)
            let closestPlayer = this.player;
            let closestDist = distance(enemy.x, enemy.y, this.player.x, this.player.y);
            
            [...this.bots, ...this.remotePlayers].forEach(player => {
                const dist = distance(enemy.x, enemy.y, player.x, player.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestPlayer = player;
                }
            });
            
            // Move towards closest player
            enemy.update(closestPlayer.x, closestPlayer.y);
            
            // Check collision with player
            if (circleCollision(
                this.player.x, this.player.y, this.player.radius,
                enemy.x, enemy.y, enemy.radius
            )) {
                // If player is bigger, eat the enemy
                if (this.player.radius > enemy.radius * 1.2) {
                    this.player.score += enemy.value;
                    this.player.radius += enemy.radius * 0.2;
                    // Adjust player speed based on size
                    this.player.updateSpeed();
                    this.updateScore();
                    enemy.markedForDeletion = true;
                } else {
                    // If enemy is bigger or similar size, game over
                    this.endGame();
                }
            }
        });
        
        // Update projectiles
        this.projectiles.forEach(projectile => {
            projectile.update();
            
            // Check collision with enemies
            for (const enemy of this.enemies) {
                if (circleCollision(
                    projectile.x, projectile.y, projectile.radius,
                    enemy.x, enemy.y, enemy.radius
                )) {
                    // Damage enemy
                    const points = enemy.takeDamage(projectile.damage);
                    if (points > 0 && projectile.owner === this.player) {
                        this.player.score += points;
                        this.updateScore();
                    } else if (points > 0 && projectile.owner) {
                        // Award points to the owner (bot or remote player)
                        projectile.owner.score += points;
                    }
                    
                    // Remove projectile
                    projectile.markedForDeletion = true;
                    break;
                }
            }
            
            // Check collision with players (only if not fired by the same player)
            if (!projectile.markedForDeletion) {
                for (const player of allPlayers) {
                    // Skip if this is the projectile owner
                    if (player === projectile.owner) continue;
                    
                    if (circleCollision(
                        projectile.x, projectile.y, projectile.radius,
                        player.x, player.y, player.radius
                    )) {
                        // Damage player
                        player.radius -= projectile.damage * 0.05;
                        
                        // If player gets too small, they die
                        if (player.radius < 10) {
                            if (player === this.player) {
                                this.endGame();
                            } else if (player.isRemote) {
                                // Remote players are handled by their own clients
                            } else {
                                // Bot dies
                                player.markedForDeletion = true;
                                
                                // Award points to the shooter
                                if (projectile.owner) {
                                    projectile.owner.score += Math.floor(player.score * 0.5);
                                    if (projectile.owner === this.player) {
                                        this.updateScore();
                                    }
                                }
                            }
                        }
                        
                        // Remove projectile
                        projectile.markedForDeletion = true;
                        break;
                    }
                }
            }
        });
        
        // Check food collision with player
        this.food.forEach(food => {
            if (circleCollision(
                this.player.x, this.player.y, this.player.radius,
                food.x, food.y, food.radius
            )) {
                // Collect food
                this.player.score += food.value;
                this.updateScore();
                food.markedForDeletion = true;
                
                // Grow player slightly
                this.player.radius += 0.2;
                // Adjust player speed based on size
                this.player.updateSpeed();
            }
        });
        
        // Fire player towers
        this.player.towers.forEach(tower => {
            if (tower.canFire(currentTime)) {
                // Find targets - can be enemies or other players
                const target = this.findTowerTarget(tower, this.player, allPlayers);
                if (target) {
                    const projectile = tower.fire(currentTime, target.x, target.y);
                    projectile.owner = this.player; // Track who fired this projectile
                    this.projectiles.push(projectile);
                }
            }
        });
        
        // Remove marked entities
        this.enemies = this.enemies.filter(enemy => !enemy.markedForDeletion);
        this.projectiles = this.projectiles.filter(projectile => !projectile.markedForDeletion);
        this.food = this.food.filter(food => !food.markedForDeletion);
        this.bots = this.bots.filter(bot => !bot.markedForDeletion);
        
        // Respawn bots if needed (in single player mode)
        if (!this.multiplayerEnabled && this.bots.length < this.botCount) {
            this.respawnBots();
        }
    }

    findTowerTarget(tower, owner, allPlayers) {
        // First check for enemies in range
        let target = tower.findTarget(this.enemies);
        
        // If no enemy found, check for players
        if (!target) {
            let closestPlayer = null;
            let closestDistance = tower.range;
            
            for (const player of allPlayers) {
                // Skip the tower owner
                if (player === owner) continue;
                
                // Skip friendly players in multiplayer (if owner is not a bot)
                if (this.multiplayerEnabled && !owner.isBot && !player.isBot) continue;
                
                const dist = distance(tower.x, tower.y, player.x, player.y);
                if (dist < closestDistance) {
                    // Only target players that are smaller than the owner
                    if (owner.radius > player.radius * 1.2) {
                        closestDistance = dist;
                        closestPlayer = player;
                    }
                }
            }
            
            target = closestPlayer;
        }
        
        return target;
    }

    updateTowerSizes() {
        // Update all towers to ensure they don't exceed player size
        const types = ['basic', 'fast', 'heavy'];
        
        types.forEach(type => {
            const level = this.player.towerLevels[type];
            if (level > 0) {
                const tower = this.player.towers.find(t => t.type === type);
                if (tower) {
                    tower.upgrade(level, this.player.radius);
                }
            }
        });
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Save context state
        this.ctx.save();
        
        // Translate for camera
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw world border
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.worldWidth, this.worldHeight);
        
        // Draw grid
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 0.5;
        const gridSize = 100;
        for (let x = 0; x <= this.worldWidth; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.worldHeight);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.worldHeight; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.worldWidth, y);
            this.ctx.stroke();
        }
        
        // Draw food
        this.food.forEach(food => food.draw(this.ctx));
        
        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        
        // Draw projectiles
        this.projectiles.forEach(projectile => projectile.draw(this.ctx));
        
        // Draw bots
        this.bots.forEach(bot => bot.draw(this.ctx));
        
        // Draw remote players
        this.remotePlayers.forEach(player => player.draw(this.ctx));
        
        // Draw player
        this.player.draw(this.ctx);
        
        // Draw player name
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(this.playerName, this.player.x, this.player.y - this.player.radius - 5);
        
        // Restore context state
        this.ctx.restore();
        
        // Draw multiplayer status if enabled
        if (this.multiplayerEnabled) {
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(`Room: ${this.multiplayer.roomId || 'Connecting...'}`, 10, 10);
            this.ctx.fillText(`Players: ${1 + Object.keys(this.multiplayer.otherPlayers).length}`, 10, 30);
        }
    }

    updateScore() {
        document.getElementById('scoreValue').textContent = this.player.score;
        
        // Update tower buttons based on score
        const types = ['basic', 'fast', 'heavy'];
        const baseCosts = [10, 25, 50];
        const keyNumbers = ['1', '2', '3'];
        
        types.forEach((type, index) => {
            const currentLevel = this.player.towerLevels[type];
            const baseCost = baseCosts[index];
            const cost = currentLevel === 0 ? baseCost : Math.floor(baseCost * (1 + 0.5 * currentLevel));
            
            const buttonId = type + 'Tower';
            const button = document.getElementById(buttonId);
            
            // Update button state
            button.disabled = this.player.score < cost;
            
            // Update button text if tower exists
            if (currentLevel > 0) {
                const buttonText = type.charAt(0).toUpperCase() + type.slice(1) + ' Tower (' + cost + ')<br><small>Key: ' + keyNumbers[index] + '</small>';
                button.innerHTML = buttonText;
            }
        });
    }

    endGame() {
        this.gameOver = true;
        document.getElementById('finalScore').textContent = this.player.score;
        document.getElementById('gameOver').classList.remove('hidden');
        
        // Show multiplayer-specific options if in multiplayer mode
        if (this.multiplayerEnabled) {
            document.getElementById('multiplayerOptions').classList.remove('hidden');
        }
    }

    restart() {
        // Reset game state
        this.player = new Player(this.worldWidth / 2, this.worldHeight / 2);
        this.enemies = [];
        this.projectiles = [];
        this.food = [];
        this.bots = [];
        this.score = 0;
        this.gameOver = false;
        this.lastEnemySpawnTime = 0;
        this.enemySpawnRate = 3000;
        this.lastFoodSpawnTime = 0;
        
        // Create new bots
        this.createBots();
        
        // Hide game over screen
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('multiplayerOptions').classList.add('hidden');
        
        // Reset tower buttons to show shortcuts
        document.getElementById('basicTower').innerHTML = 'Basic Tower (10)<br><small>Key: 1</small>';
        document.getElementById('fastTower').innerHTML = 'Fast Tower (25)<br><small>Key: 2</small>';
        document.getElementById('heavyTower').innerHTML = 'Heavy Tower (50)<br><small>Key: 3</small>';
        
        // Reset score
        this.updateScore();
    }

    createBots() {
        this.bots = [];
        
        // Create bots at random positions
        for (let i = 0; i < this.botCount; i++) {
            // Generate random position away from player
            let x, y;
            do {
                x = random(100, this.worldWidth - 100);
                y = random(100, this.worldHeight - 100);
            } while (distance(x, y, this.player.x, this.player.y) < 500);
            
            // Create bot with random name and color
            const botName = this.botNames[i % this.botNames.length];
            const botColor = this.botColors[i % this.botColors.length];
            
            // Assign difficulty - if mixed, distribute evenly
            let difficulty = this.botDifficulty;
            if (difficulty === 'mixed') {
                const difficulties = ['easy', 'medium', 'hard'];
                difficulty = difficulties[i % difficulties.length];
            }
            
            const bot = new Bot(x, y, botName, botColor, difficulty);
            this.bots.push(bot);
        }
    }

    respawnBots() {
        const botsToAdd = this.botCount - this.bots.length;
        
        for (let i = 0; i < botsToAdd; i++) {
            // Generate random position away from player
            let x, y;
            do {
                x = random(100, this.worldWidth - 100);
                y = random(100, this.worldHeight - 100);
            } while (distance(x, y, this.player.x, this.player.y) < 500);
            
            // Create bot with random name and color
            const botName = this.botNames[random(0, this.botNames.length - 1)];
            const botColor = this.botColors[random(0, this.botColors.length - 1)];
            
            // Assign difficulty - if mixed, choose randomly
            let difficulty = this.botDifficulty;
            if (difficulty === 'mixed') {
                const difficulties = ['easy', 'medium', 'hard'];
                difficulty = difficulties[random(0, 2)];
            }
            
            const bot = new Bot(x, y, botName, botColor, difficulty);
            this.bots.push(bot);
        }
    }
} 