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
        this.debugMode = false;
        
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
        const basicTowerBtn = document.getElementById('basicTower');
        const fastTowerBtn = document.getElementById('fastTower');
        const heavyTowerBtn = document.getElementById('heavyTower');
        
        // Add both click and touch events for tower buttons
        basicTowerBtn.addEventListener('click', () => this.placeTower('basic'));
        fastTowerBtn.addEventListener('click', () => this.placeTower('fast'));
        heavyTowerBtn.addEventListener('click', () => this.placeTower('heavy'));
        
        // Add touch events specifically for mobile
        if (this.isMobile) {
            basicTowerBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.placeTower('basic');
            });
            
            fastTowerBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.placeTower('fast');
            });
            
            heavyTowerBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.placeTower('heavy');
            });
        }
        
        // Update button text to show shortcuts
        basicTowerBtn.innerHTML = 'Basic Tower (10)<br><small>Key: 1</small>';
        fastTowerBtn.innerHTML = 'Fast Tower (25)<br><small>Key: 2</small>';
        heavyTowerBtn.innerHTML = 'Heavy Tower (50)<br><small>Key: 3</small>';
        
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
        
        // Add debug key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'd') {
                this.logGameState();
            }
        });
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
            
            // Format button text differently for mobile
            let buttonText;
            if (this.isMobile) {
                buttonText = type.charAt(0).toUpperCase() + type.slice(1) + '<br>(' + nextCost + ')<br><small>Key: ' + keyNumber + '</small>';
            } else {
                buttonText = type.charAt(0).toUpperCase() + type.slice(1) + ' Tower (' + nextCost + ')<br><small>Key: ' + keyNumber + '</small>';
            }
            
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
            
            // Ensure enemy doesn't spawn too close to a new player
            const minSpawnDistance = 600; // Minimum distance for enemies to spawn from new players
            let tooCloseToNewPlayer = false;
            
            const allPlayers = [this.player, ...this.bots, ...this.remotePlayers];
            for (const player of allPlayers) {
                // Only check for players in grace period
                if (player.isInvulnerable && player.isInvulnerable(currentTime)) {
                    const dist = distance(x, y, player.x, player.y);
                    if (dist < minSpawnDistance) {
                        tooCloseToNewPlayer = true;
                        break;
                    }
                }
            }
            
            // Only spawn if not too close to a new player
            if (!tooCloseToNewPlayer) {
                // Random size and speed (bigger = slower)
                const radius = random(15, 40);
                const speed = 3 - (radius - 15) / 25 * 2; // Speed between 1-3 based on size
                const value = Math.floor(radius * 2);
                
                this.enemies.push(new Enemy(x, y, radius, speed, value));
                
                // Increase spawn rate as game progresses (more slowly)
                this.enemySpawnRate = Math.max(1000, this.enemySpawnRate - 5); // Changed from 500 to 1000 minimum, and from -10 to -5
            }
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
        
        // Debug collision detection
        if (this.debugMode) {
            console.log("Player position:", this.player.x.toFixed(1), this.player.y.toFixed(1), "radius:", this.player.radius.toFixed(1));
            
            // Log remote player positions for debugging
            this.remotePlayers.forEach(remotePlayer => {
                console.log(`Remote player ${remotePlayer.nickname}: x=${remotePlayer.x.toFixed(1)}, y=${remotePlayer.y.toFixed(1)}, radius=${remotePlayer.radius.toFixed(1)}`);
                
                // Check if collision should be happening
                const dist = distance(this.player.x, this.player.y, remotePlayer.x, remotePlayer.y);
                const collisionShouldHappen = dist < (this.player.radius + remotePlayer.radius);
                
                if (collisionShouldHappen) {
                    console.log(`Collision should happen with ${remotePlayer.nickname}, distance: ${dist.toFixed(1)}, sum of radii: ${(this.player.radius + remotePlayer.radius).toFixed(1)}`);
                    
                    // Force collision check
                    this.handlePlayerRemotePlayerCollision(this.player, remotePlayer);
                }
            });
            
            // Log bot positions for debugging
            this.bots.forEach(bot => {
                const dist = distance(this.player.x, this.player.y, bot.x, bot.y);
                const collisionShouldHappen = dist < (this.player.radius + bot.radius);
                
                if (collisionShouldHappen) {
                    console.log(`Collision should happen with bot ${bot.name}, distance: ${dist.toFixed(1)}, sum of radii: ${(this.player.radius + bot.radius).toFixed(1)}`);
                    
                    // Force collision check
                    this.handlePlayerBotCollision(this.player, bot);
                }
            });
        }
        
        // ALWAYS check for collisions, not just in debug mode
        this.remotePlayers.forEach(remotePlayer => {
            // Skip if remote player is too small (dead)
            if (remotePlayer.radius < 10) return;
            
            const dist = distance(this.player.x, this.player.y, remotePlayer.x, remotePlayer.y);
            if (dist < (this.player.radius + remotePlayer.radius)) {
                this.handlePlayerRemotePlayerCollision(this.player, remotePlayer);
            }
        });
        
        this.bots.forEach(bot => {
            const dist = distance(this.player.x, this.player.y, bot.x, bot.y);
            if (dist < (this.player.radius + bot.radius)) {
                this.handlePlayerBotCollision(this.player, bot);
            }
        });
        
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
            this.handlePlayerBotCollision(this.player, bot);
            
            // Check bot collision with remote players
            this.remotePlayers.forEach(remotePlayer => {
                if (circleCollision(
                    remotePlayer.x, remotePlayer.y, remotePlayer.radius,
                    bot.x, bot.y, bot.radius
                )) {
                    if (remotePlayer.radius > bot.radius * 1.05) {
                        // Remote player eats bot
                        bot.markedForDeletion = true;
                    } else if (bot.radius > remotePlayer.radius * 1.05) {
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
                    if (bot.radius > otherBot.radius * 1.05) {
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
            // Skip if remote player is too small (dead)
            if (remotePlayer.radius < 10) return;
            
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
            this.handlePlayerRemotePlayerCollision(this.player, remotePlayer);
            
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
                console.log(`COLLISION DETECTED between player (${this.player.radius.toFixed(1)}) and enemy (${enemy.radius.toFixed(1)})`);
                
                // If player is bigger, eat the enemy (reduced size advantage requirement)
                if (this.player.radius > enemy.radius * 1.02) {
                    console.log(`Player eats enemy (player: ${this.player.radius.toFixed(1)}, enemy: ${enemy.radius.toFixed(1)})`);
                    this.player.score += enemy.value;
                    this.player.radius += enemy.radius * 0.2;
                    // Adjust player speed based on size
                    this.player.updateSpeed();
                    this.updateScore();
                    enemy.markedForDeletion = true;
                } else if (enemy.radius > this.player.radius * 1.02 && !this.gameOver) {
                    // If enemy is bigger, game over (reduced size advantage requirement)
                    console.log(`Enemy eats player (enemy: ${enemy.radius.toFixed(1)}, player: ${this.player.radius.toFixed(1)})`);
                    this.endGame("Eaten by enemy blob");
                } else {
                    console.log(`Size difference too small to eat: ${(this.player.radius / enemy.radius).toFixed(2)}x`);
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
                    
                    // Create hit effect
                    this.createHitEffect(enemy.x, enemy.y);
                    
                    // Remove projectile
                    projectile.markedForDeletion = true;
                    break;
                }
            }
            
            // Check collision with players (only if not fired by the same player)
            if (!projectile.markedForDeletion) {
                // First check collision with player
                if (projectile.owner !== this.player && 
                    circleCollision(
                        projectile.x, projectile.y, projectile.radius,
                        this.player.x, this.player.y, this.player.radius
                    )) {
                    
                    // Check if player is in invulnerability period
                    if (!this.player.isInvulnerable(currentTime)) {
                        // Damage player - increased effect
                        const damageAmount = projectile.damage * 0.5; // Reduced total damage with 0.5 coefficient
                        this.player.radius -= damageAmount;
                        
                        // Create hit effect
                        this.createHitEffect(this.player.x, this.player.y);
                        
                        // Log damage for debugging
                        console.log(`Player hit by projectile for ${damageAmount.toFixed(1)} damage. New radius: ${this.player.radius.toFixed(1)}`);
                        
                        // If player gets too small, they die
                        if (this.player.radius < 10 && !this.gameOver) {
                            console.log(`Game over: Player (radius ${this.player.radius.toFixed(1)}) killed by projectile from ${projectile.owner ? (projectile.owner.nickname || projectile.owner.name || 'bot') : 'unknown'}`);
                            this.endGame("Killed by projectile");
                        }
                    } else {
                        // Player is invulnerable - create shield effect but no damage
                        this.createShieldEffect(this.player.x, this.player.y, this.player.radius);
                        console.log("Player is invulnerable - no damage taken");
                    }
                    
                    // Remove projectile regardless of invulnerability
                    projectile.markedForDeletion = true;
                }
                
                // Then check collision with bots and remote players
                if (!projectile.markedForDeletion) {
                    for (const player of [...this.bots, ...this.remotePlayers]) {
                        // Skip if this is the projectile owner
                        if (player === projectile.owner) continue;
                        
                        if (circleCollision(
                            projectile.x, projectile.y, projectile.radius,
                            player.x, player.y, player.radius
                        )) {
                            // Check if bot/remote player is in invulnerability period
                            if (!player.isInvulnerable || !player.isInvulnerable(currentTime)) {
                                // Damage player
                                const damageAmount = projectile.damage * 0.5;
                                player.radius -= damageAmount;
                                
                                // Create hit effect
                                this.createHitEffect(player.x, player.y);
                                
                                // Log damage for debugging
                                console.log(`${player.nickname || player.name || 'bot'} hit by projectile for ${damageAmount.toFixed(1)} damage. New radius: ${player.radius.toFixed(1)}`);
                                
                                // If player gets too small, they die
                                if (player.radius < 10) {
                                    // Bot or remote player dies
                                    player.markedForDeletion = true;
                                    
                                    // Award points to the shooter
                                    if (projectile.owner) {
                                        projectile.owner.score += Math.floor(player.score * 0.5);
                                        if (projectile.owner === this.player) {
                                            this.updateScore();
                                        }
                                    }
                                }
                            } else {
                                // Player is invulnerable - create shield effect but no damage
                                this.createShieldEffect(player.x, player.y, player.radius);
                            }
                            
                            // Remove projectile regardless of invulnerability
                            projectile.markedForDeletion = true;
                            break;
                        }
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
                    // Allow targeting any player regardless of size
                    closestDistance = dist;
                    closestPlayer = player;
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
        
        // Draw hit effects
        if (this.hitEffects && this.hitEffects.length > 0) {
            // Update and draw hit effects
            this.hitEffects = this.hitEffects.filter(effect => {
                const isActive = effect.update();
                if (isActive) {
                    effect.draw(this.ctx);
                }
                return isActive;
            });
        }
        
        // Draw shield effects
        if (this.shieldEffects && this.shieldEffects.length > 0) {
            // Update and draw shield effects
            this.shieldEffects = this.shieldEffects.filter(effect => {
                const isActive = effect.update();
                if (isActive) {
                    effect.draw(this.ctx);
                }
                return isActive;
            });
        }
        
        // Draw bots
        this.bots.forEach(bot => {
            bot.draw(this.ctx);
            
            // Draw invulnerability shield if bot is in grace period
            const currentTime = Date.now();
            if (bot.isInvulnerable && bot.isInvulnerable(currentTime)) {
                this.drawInvulnerabilityShield(this.ctx, bot);
            }
        });
        
        // Draw remote players
        this.remotePlayers.forEach(player => {
            player.draw(this.ctx);
            
            // Draw invulnerability shield if remote player is in grace period
            const currentTime = Date.now();
            if (player.isInvulnerable && player.isInvulnerable(currentTime)) {
                this.drawInvulnerabilityShield(this.ctx, player);
            }
        });
        
        // Draw player
        this.player.draw(this.ctx);
        
        // Draw invulnerability shield if player is in grace period
        const currentTime = Date.now();
        if (this.player.isInvulnerable(currentTime)) {
            this.drawInvulnerabilityShield(this.ctx, this.player);
        }
        
        // Draw player name
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(this.playerName, this.player.x, this.player.y - this.player.radius - 5);
        
        // Restore context state
        this.ctx.restore();
        
        // Draw scoreboard in the upper right corner
        this.drawScoreboard();
        
        // Draw multiplayer status if enabled
        if (this.multiplayerEnabled) {
            // Create a div for room info if it doesn't exist
            let roomInfoDiv = document.getElementById('roomInfo');
            if (!roomInfoDiv) {
                roomInfoDiv = document.createElement('div');
                roomInfoDiv.id = 'roomInfo';
                roomInfoDiv.className = 'room-info';
                document.getElementById('ui').appendChild(roomInfoDiv);
            }
            
            // Update room info content
            roomInfoDiv.innerHTML = `
                Room: ${this.multiplayer.roomId || 'Connecting...'}<br>
                Players: ${1 + Object.keys(this.multiplayer.otherPlayers).length}
            `;
        } else {
            // Remove room info div if not in multiplayer
            const roomInfoDiv = document.getElementById('roomInfo');
            if (roomInfoDiv) {
                roomInfoDiv.remove();
            }
        }
        
        // Draw debug info if enabled
        if (this.debugMode) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(10, 50, 250, 150);
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(`Player Radius: ${this.player.radius.toFixed(1)}`, 20, 60);
            this.ctx.fillText(`Player Score: ${this.player.score}`, 20, 80);
            this.ctx.fillText(`Game Over: ${this.gameOver}`, 20, 100);
            this.ctx.fillText(`Bots: ${this.bots.length}`, 20, 120);
            this.ctx.fillText(`Remote Players: ${this.remotePlayers.length}`, 20, 140);
            this.ctx.fillText(`Enemies: ${this.enemies.length}`, 20, 160);
            this.ctx.fillText(`FPS: ${(1000 / (Date.now() - this._lastFrameTime)).toFixed(1)}`, 20, 180);
            this._lastFrameTime = Date.now();
        }
    }

    // Draw scoreboard in the upper right corner
    drawScoreboard() {
        // Get all players (including bots and remote players)
        const allPlayers = [
            {
                name: this.playerName,
                score: this.player.score,
                radius: this.player.radius,
                isPlayer: true,
                color: this.player.color
            },
            ...this.bots.map(bot => ({
                name: bot.name || bot.botName,
                score: bot.score,
                radius: bot.radius,
                isBot: true,
                color: bot.color
            })),
            ...this.remotePlayers.map(player => ({
                name: player.nickname || 'Remote Player',
                score: player.score || 0,
                radius: player.radius,
                isRemote: true,
                color: player.color
            }))
        ];
        
        // Sort players by score (highest first)
        allPlayers.sort((a, b) => b.score - a.score);
        
        // Limit to top 10 players
        const topPlayers = allPlayers.slice(0, 10);
        
        // Draw scoreboard background
        const padding = 10;
        const lineHeight = 25;
        const width = 200;
        const height = Math.min(topPlayers.length * lineHeight + padding * 2 + 25, 300);
        const x = this.width - width - padding;
        const y = padding;
        
        // Semi-transparent background with class-based styling
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x, y, width, height);
        
        // Draw border
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);
        
        // Draw title
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText('SCOREBOARD', x + width / 2, y + padding);
        
        // Draw player scores
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        
        topPlayers.forEach((player, index) => {
            const playerY = y + padding + 25 + index * lineHeight;
            
            // Draw rank
            this.ctx.fillStyle = '#AAA';
            this.ctx.fillText(`${index + 1}.`, x + 10, playerY);
            
            // Draw colored circle for player
            this.ctx.fillStyle = player.color || '#FFF';
            this.ctx.beginPath();
            this.ctx.arc(x + 30, playerY + 7, 7, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Highlight current player
            if (player.isPlayer) {
                this.ctx.fillStyle = '#FFFF00';
            } else {
                this.ctx.fillStyle = '#FFF';
            }
            
            // Draw player name (truncate if too long)
            let displayName = player.name || 'Player';
            if (displayName.length > 6) {
                displayName = displayName.substring(0, 6) + '..';
            }
            
            // Add indicator for player type (shorter)
            if (player.isPlayer) {
                displayName += ' (You)';
            } else if (player.isBot) {
                displayName += ' (B)';
            }
            
            this.ctx.fillText(displayName, x + 45, playerY);
            
            // Draw score
            this.ctx.textAlign = 'right';
            this.ctx.fillText(player.score.toString(), x + width - 10, playerY);
            this.ctx.textAlign = 'left';
        });
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
            button.style.opacity = this.player.score < cost ? '0.5' : '1';
            
            // Update button text if tower exists
            if (currentLevel > 0) {
                // Format button text differently for mobile
                let buttonText;
                if (this.isMobile) {
                    buttonText = type.charAt(0).toUpperCase() + type.slice(1) + '<br>(' + cost + ')<br><small>Key: ' + keyNumbers[index] + '</small>';
                } else {
                    buttonText = type.charAt(0).toUpperCase() + type.slice(1) + ' Tower (' + cost + ')<br><small>Key: ' + keyNumbers[index] + '</small>';
                }
                
                button.innerHTML = buttonText;
            }
        });
    }

    endGame(reason = "Game Over") {
        // Only end the game if the player is actually dead or has been eaten
        if (!this.player || this.player.radius < 10) {
            console.log(`Game over triggered: ${reason}`);
            this.gameOver = true;
            document.getElementById('finalScore').textContent = this.player ? this.player.score : 0;
            document.getElementById('gameOver').classList.remove('hidden');
            
            // Show multiplayer-specific options if in multiplayer mode
            if (this.multiplayerEnabled) {
                document.getElementById('multiplayerOptions').classList.remove('hidden');
            }
        } else {
            console.warn(`Attempted to end game but player is still alive. Reason: ${reason}, Player radius: ${this.player.radius.toFixed(1)}`);
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
            } while (distance(x, y, this.player.x, this.player.y) < 700); // Increased from 500 to 700 for better spawn protection
            
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

    // Debug method to log game state
    logGameState() {
        console.group("Game State Debug");
        console.log("Game Over:", this.gameOver);
        console.log("Player:", {
            x: this.player ? this.player.x.toFixed(1) : "N/A",
            y: this.player ? this.player.y.toFixed(1) : "N/A",
            radius: this.player ? this.player.radius.toFixed(1) : "N/A",
            score: this.player ? this.player.score : "N/A"
        });
        console.log("Bots:", this.bots.length);
        console.log("Remote Players:", this.remotePlayers.length);
        console.log("Enemies:", this.enemies.length);
        console.log("Food:", this.food.length);
        console.log("Projectiles:", this.projectiles.length);
        console.log("Multiplayer Enabled:", this.multiplayerEnabled);
        if (this.multiplayer) {
            console.log("Multiplayer Connected:", this.multiplayer.isConnected);
            console.log("Room ID:", this.multiplayer.roomId);
            console.log("Other Players:", Object.keys(this.multiplayer.otherPlayers).length);
        }
        console.groupEnd();
        
        // Toggle debug mode
        this.debugMode = !this.debugMode;
    }

    // Helper method to handle collision between player and bot
    handlePlayerBotCollision(player, bot) {
        // Force collision check with exact distance calculation
        const dist = distance(player.x, player.y, bot.x, bot.y);
        const collisionThreshold = player.radius + bot.radius;
        
        // Always log collisions to help diagnose issues
        console.log(`Checking collision: Player (${player.radius.toFixed(1)}) and bot ${bot.name} (${bot.radius.toFixed(1)})`);
        console.log(`Distance: ${dist.toFixed(1)}, Threshold: ${collisionThreshold.toFixed(1)}`);
        
        // Use a more aggressive collision detection (0.95 instead of 0.9)
        if (dist < collisionThreshold * 0.95) {
            console.log(`COLLISION DETECTED between player and bot ${bot.name}!`);
            
            // Check size difference more aggressively (1.02 instead of 1.05)
            if (player.radius > bot.radius * 1.02) {
                // Player eats bot
                console.log(`Player (${player.radius.toFixed(1)}) eats bot ${bot.name} (${bot.radius.toFixed(1)})`);
                player.score += Math.floor(bot.score);
                player.radius += bot.radius * 0.2;
                player.updateSpeed();
                this.updateScore();
                bot.markedForDeletion = true;
            } else if (bot.radius > player.radius * 1.02 && !this.gameOver) {
                // Bot eats player
                console.log(`Bot ${bot.name} (${bot.radius.toFixed(1)}) eats player (${player.radius.toFixed(1)})`);
                this.endGame("Eaten by " + bot.name);
            } else {
                console.log(`Size difference too small to eat: ${(player.radius / bot.radius).toFixed(2)}x`);
            }
        }
    }
    
    // Helper method to handle collision between player and remote player
    handlePlayerRemotePlayerCollision(player, remotePlayer) {
        // Force collision check with exact distance calculation
        const dist = distance(player.x, player.y, remotePlayer.x, remotePlayer.y);
        const collisionThreshold = player.radius + remotePlayer.radius;
        
        // Always log collisions to help diagnose issues
        console.log(`Checking collision: Player (${player.radius.toFixed(1)}) and ${remotePlayer.nickname} (${remotePlayer.radius.toFixed(1)})`);
        console.log(`Distance: ${dist.toFixed(1)}, Threshold: ${collisionThreshold.toFixed(1)}`);
        
        // Use a more aggressive collision detection (0.95 instead of 0.9)
        if (dist < collisionThreshold * 0.95) {
            console.log(`COLLISION DETECTED between player and remote player ${remotePlayer.nickname}!`);
            
            // Check size difference more aggressively (1.02 instead of 1.05)
            if (player.radius > remotePlayer.radius * 1.02) {
                // Player eats remote player
                console.log(`Player (${player.radius.toFixed(1)}) eats remote player ${remotePlayer.nickname} (${remotePlayer.radius.toFixed(1)})`);
                player.score += Math.floor(remotePlayer.score || 0);
                player.radius += remotePlayer.radius * 0.2;
                player.updateSpeed();
                this.updateScore();
                
                // Make remote player very small to indicate they've been eaten
                remotePlayer.radius = 5;
                
                // Notify multiplayer system that we ate this player
                if (this.multiplayer) {
                    this.multiplayer.sendPlayerState();
                }
            } else if (remotePlayer.radius > player.radius * 1.02 && !this.gameOver) {
                // Remote player eats player
                console.log(`Remote player ${remotePlayer.nickname} (${remotePlayer.radius.toFixed(1)}) eats player (${player.radius.toFixed(1)})`);
                this.endGame("Eaten by " + remotePlayer.nickname);
            } else {
                console.log(`Size difference too small to eat: ${(player.radius / remotePlayer.radius).toFixed(2)}x`);
            }
        }
    }

    // Create a visual hit effect
    createHitEffect(x, y) {
        // Create a visual hit effect that will be drawn on the canvas
        const hitEffect = {
            x: x,
            y: y,
            radius: 10,
            alpha: 1.0,
            color: '#FFFF00',
            update: function() {
                this.radius += 1;
                this.alpha -= 0.05;
                return this.alpha > 0;
            },
            draw: (ctx) => {
                ctx.globalAlpha = hitEffect.alpha;
                ctx.beginPath();
                ctx.arc(hitEffect.x, hitEffect.y, hitEffect.radius, 0, Math.PI * 2);
                ctx.fillStyle = hitEffect.color;
                ctx.fill();
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        };
        
        // Add to a list of effects if we don't have one yet
        if (!this.hitEffects) {
            this.hitEffects = [];
        }
        
        this.hitEffects.push(hitEffect);
        
        // Log hit effect for debugging
        if (this.debugMode) {
            console.log(`Hit effect at ${x.toFixed(1)}, ${y.toFixed(1)}`);
        }
    }

    // Add a method to draw invulnerability shield
    drawInvulnerabilityShield(ctx, entity) {
        ctx.beginPath();
        ctx.arc(entity.x, entity.y, entity.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Add a glow effect
        ctx.beginPath();
        ctx.arc(entity.x, entity.y, entity.radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Create a shield effect
    createShieldEffect(x, y, radius) {
        // Create a visual shield effect that will be drawn on the canvas
        const shieldEffect = {
            x: x,
            y: y,
            radius: radius + 5,
            alpha: 1.0,
            color: 'rgba(0, 255, 255, 0.5)',
            update: function() {
                this.radius += 0.5;
                this.alpha -= 0.05;
                return this.alpha > 0;
            },
            draw: (ctx) => {
                ctx.globalAlpha = shieldEffect.alpha;
                ctx.beginPath();
                ctx.arc(shieldEffect.x, shieldEffect.y, shieldEffect.radius, 0, Math.PI * 2);
                ctx.strokeStyle = shieldEffect.color;
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        };
        
        // Add to a list of effects if we don't have one yet
        if (!this.shieldEffects) {
            this.shieldEffects = [];
        }
        
        this.shieldEffects.push(shieldEffect);
    }
}

// Main game loop
let game;
let lastTime = 0;

function gameLoop(currentTime) {
    // Initialize lastTime on first run
    if (!lastTime) {
        lastTime = currentTime;
    }
    
    // Calculate delta time
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Update and draw game
    if (game) {
        game.update(currentTime);
        game.draw();
    }
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Initialize game when window loads
window.addEventListener('load', () => {
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        game = new Game(canvas);
        
        // Start game loop
        requestAnimationFrame(gameLoop);
    } else {
        console.error('Canvas element not found!');
    }
}); 