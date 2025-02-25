/**
 * Game entities
 */

// Base Entity class
class Entity {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.markedForDeletion = false;
    }

    update() {
        // Base update method, to be overridden
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Player class
class Player extends Entity {
    constructor(x, y) {
        super(x, y, 20, '#4CAF50');
        this.velocity = { x: 0, y: 0 };
        this.baseSpeed = 2; // Base speed value
        this.speed = this.baseSpeed;
        this.score = 0;
        this.towers = [];
        this.towerLevels = {
            'basic': 0,
            'fast': 0,
            'heavy': 0
        };
    }

    updateSpeed() {
        // Decrease speed as player grows larger
        this.speed = this.baseSpeed * (30 / this.radius);
        // Ensure minimum speed
        this.speed = Math.max(0.5, this.speed);
    }

    update(mouseX, mouseY, worldWidth, worldHeight) {
        // Move towards mouse
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            this.velocity.x = (dx / dist) * this.speed;
            this.velocity.y = (dy / dist) * this.speed;
        }

        // Update position
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Keep player within bounds
        this.x = clamp(this.x, this.radius, worldWidth - this.radius);
        this.y = clamp(this.y, this.radius, worldHeight - this.radius);

        // Update size based on score
        this.updateSizeBasedOnScore();

        // Update towers
        this.towers.forEach(tower => tower.update(this.x, this.y));
    }

    updateSizeBasedOnScore() {
        // Base size is 20, increase by 1 for every 100 points
        const scoreBasedSize = 20 + Math.floor(this.score / 100);
        
        // Only grow if score-based size is larger than current size
        if (scoreBasedSize > this.radius) {
            this.radius = scoreBasedSize;
            this.updateSpeed();
        }
    }

    addTower(type) {
        // If tower type already exists, upgrade it instead of adding a new one
        const existingTower = this.towers.find(tower => tower.type === type);
        
        if (existingTower) {
            // Upgrade existing tower
            this.towerLevels[type]++;
            existingTower.upgrade(this.towerLevels[type], this.radius);
            return existingTower;
        } else {
            // Add new tower
            let tower;
            switch (type) {
                case 'basic':
                    tower = new BasicTower(this.x, this.y);
                    break;
                case 'fast':
                    tower = new FastTower(this.x, this.y);
                    break;
                case 'heavy':
                    tower = new HeavyTower(this.x, this.y);
                    break;
            }
            this.towerLevels[type] = 1;
            this.towers.push(tower);
            return tower;
        }
    }

    draw(ctx) {
        // Draw player
        super.draw(ctx);
        
        // Draw towers
        this.towers.forEach(tower => tower.draw(ctx));
    }
}

// Enemy class
class Enemy extends Entity {
    constructor(x, y, radius, speed, value) {
        super(x, y, radius, randomColor());
        this.speed = speed * 0.5;
        this.value = value;
        this.health = radius;
    }

    update(playerX, playerY) {
        // Move towards player
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }

    takeDamage(amount) {
        this.health -= amount;
        // Shrink enemy when damaged
        this.radius = this.health;
        
        if (this.health <= 5) {
            this.markedForDeletion = true;
            return this.value;
        }
        return 0;
    }
}

// Base Tower class
class Tower extends Entity {
    constructor(x, y, radius, color, fireRate, damage, range, type) {
        super(x, y, radius, color);
        this.type = type;
        this.fireRate = fireRate; // shots per second
        this.damage = damage;
        this.range = range;
        this.lastFireTime = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.angle = 0;
        this.level = 1;
        this.baseRadius = radius; // Store the original radius
    }

    upgrade(level, playerRadius) {
        this.level = level;
        // Increase damage with each level
        this.damage = this.damage * (1 + 0.3 * (level - 1));
        
        // Calculate new radius but limit it to player size
        const calculatedRadius = this.baseRadius * (1 + 0.1 * (level - 1));
        this.radius = Math.min(calculatedRadius, playerRadius * 0.8);
    }

    update(playerX, playerY) {
        // Update position relative to player
        this.x = playerX + this.offsetX;
        this.y = playerY + this.offsetY;
    }

    canFire(currentTime) {
        return currentTime - this.lastFireTime > 1000 / this.fireRate;
    }

    fire(currentTime, targetX, targetY) {
        this.lastFireTime = currentTime;
        this.angle = angle(this.x, this.y, targetX, targetY);
        
        // Create and return a projectile
        return new Projectile(
            this.x, 
            this.y, 
            this.angle, 
            this.damage
        );
    }

    findTarget(enemies) {
        // Find closest enemy in range
        let closestEnemy = null;
        let closestDistance = this.range;

        for (const enemy of enemies) {
            const dist = distance(this.x, this.y, enemy.x, enemy.y);
            if (dist < closestDistance) {
                closestDistance = dist;
                closestEnemy = enemy;
            }
        }

        return closestEnemy;
    }

    draw(ctx) {
        // Draw tower base
        super.draw(ctx);
        
        // Draw tower cannon
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#333';
        ctx.fillRect(0, -2, this.radius * 1.5, 4);
        ctx.restore();
        
        // Draw level indicator if level > 1
        if (this.level > 1) {
            ctx.fillStyle = '#FFF';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.level, this.x, this.y);
        }
    }
}

// Basic Tower
class BasicTower extends Tower {
    constructor(x, y) {
        super(x, y, 10, '#4CAF50', 1, 10, 150, 'basic');
        this.offsetX = 30;
        this.offsetY = 0;
        this.cost = 10;
    }
}

// Fast Tower
class FastTower extends Tower {
    constructor(x, y) {
        super(x, y, 8, '#2196F3', 3, 5, 120, 'fast');
        this.offsetX = 0;
        this.offsetY = 30;
        this.cost = 25;
    }
}

// Heavy Tower
class HeavyTower extends Tower {
    constructor(x, y) {
        super(x, y, 12, '#F44336', 0.5, 25, 180, 'heavy');
        this.offsetX = -30;
        this.offsetY = 0;
        this.cost = 50;
    }
}

// Projectile class
class Projectile extends Entity {
    constructor(x, y, angle, damage) {
        super(x, y, 3, '#FFF');
        this.speed = 5;
        this.angle = angle;
        this.damage = damage;
        this.distance = 0;
        this.maxDistance = 300;
    }

    update() {
        // Move in the direction of angle
        const velocity = angleToVector(this.angle);
        this.x += velocity.x * this.speed;
        this.y += velocity.y * this.speed;
        
        // Track distance traveled
        this.distance += this.speed;
        
        // Mark for deletion if traveled too far
        if (this.distance > this.maxDistance) {
            this.markedForDeletion = true;
        }
    }
}

// Food class (for player to grow)
class Food extends Entity {
    constructor(x, y) {
        super(x, y, random(3, 8), randomColor());
        this.value = this.radius;
    }
}

// Bot class (AI-controlled player)
class Bot extends Player {
    constructor(x, y, name, color, difficulty = 'medium') {
        super(x, y);
        this.color = color || randomColor();
        this.botName = name || 'Bot';
        this.targetX = x;
        this.targetY = y;
        this.decisionCooldown = 0;
        this.targetFood = null;
        this.targetEnemy = null;
        this.fleeingFrom = null;
        this.state = 'wander'; // wander, chase, flee
        this.difficulty = difficulty; // easy, medium, hard
        this.stateColor = '#FFFFFF'; // Color indicator for state
        this.lastTowerPlacement = 0;
        this.towerPlacementCooldown = this.getDifficultyValue(5000, 3000, 1500); // Cooldown between tower placements
    }

    getDifficultyValue(easy, medium, hard) {
        switch(this.difficulty) {
            case 'easy': return easy;
            case 'medium': return medium;
            case 'hard': return hard;
            default: return medium;
        }
    }

    update(worldWidth, worldHeight, food, enemies, players, currentTime) {
        // Bot AI decision making
        this.decisionCooldown -= 1;
        
        if (this.decisionCooldown <= 0) {
            this.makeDecision(food, enemies, players, worldWidth, worldHeight);
            // Decision cooldown varies by difficulty
            this.decisionCooldown = this.getDifficultyValue(
                random(45, 90), // Easy: slower decisions
                random(30, 60), // Medium: normal decisions
                random(15, 30)  // Hard: faster decisions
            );
        }
        
        // Move towards target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            this.velocity.x = (dx / dist) * this.speed;
            this.velocity.y = (dy / dist) * this.speed;
        }

        // Update position
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Keep bot within bounds
        this.x = clamp(this.x, this.radius, worldWidth - this.radius);
        this.y = clamp(this.y, this.radius, worldHeight - this.radius);

        // Update size based on score
        this.updateSizeBasedOnScore();

        // Update towers
        this.towers.forEach(tower => tower.update(this.x, this.y));
        
        // Place towers based on difficulty and cooldown
        if (currentTime - this.lastTowerPlacement > this.towerPlacementCooldown && this.score >= 10) {
            this.placeTower(currentTime);
            this.lastTowerPlacement = currentTime;
        }
        
        // Update state color
        this.updateStateColor();
    }
    
    updateStateColor() {
        // Visual indicator of bot's current state
        switch(this.state) {
            case 'chase':
                this.stateColor = '#00FF00'; // Green for chasing
                break;
            case 'flee':
                this.stateColor = '#FF0000'; // Red for fleeing
                break;
            case 'wander':
            default:
                this.stateColor = '#FFFFFF'; // White for wandering
                break;
        }
    }
    
    makeDecision(food, enemies, players, worldWidth, worldHeight) {
        // Find closest food
        let closestFood = null;
        let closestFoodDist = Infinity;
        
        // Detection range varies by difficulty
        const foodDetectionRange = this.getDifficultyValue(300, 400, 500);
        
        for (const f of food) {
            const dist = distance(this.x, this.y, f.x, f.y);
            if (dist < closestFoodDist && dist < foodDetectionRange) {
                closestFoodDist = dist;
                closestFood = f;
            }
        }
        
        // Find closest smaller enemy
        let closestSmallerEnemy = null;
        let closestSmallerEnemyDist = Infinity;
        
        // Detection range varies by difficulty
        const enemyDetectionRange = this.getDifficultyValue(200, 300, 400);
        
        for (const e of enemies) {
            // Size advantage needed varies by difficulty
            const sizeAdvantage = this.getDifficultyValue(1.3, 1.2, 1.1);
            
            if (this.radius > e.radius * sizeAdvantage) {
                const dist = distance(this.x, this.y, e.x, e.y);
                if (dist < closestSmallerEnemyDist && dist < enemyDetectionRange) {
                    closestSmallerEnemyDist = dist;
                    closestSmallerEnemy = e;
                }
            }
        }
        
        // Find closest larger enemy to avoid
        let closestLargerEnemy = null;
        let closestLargerEnemyDist = this.getDifficultyValue(250, 300, 350); // Only care about enemies within this range
        
        for (const e of enemies) {
            // Size disadvantage threshold varies by difficulty
            const sizeDisadvantage = this.getDifficultyValue(1.0, 0.9, 0.8);
            
            if (this.radius <= e.radius * sizeDisadvantage) {
                const dist = distance(this.x, this.y, e.x, e.y);
                if (dist < closestLargerEnemyDist) {
                    closestLargerEnemyDist = dist;
                    closestLargerEnemy = e;
                }
            }
        }
        
        // Find closest smaller player
        let closestSmallerPlayer = null;
        let closestSmallerPlayerDist = Infinity;
        
        // Detection range varies by difficulty
        const playerDetectionRange = this.getDifficultyValue(200, 300, 400);
        
        for (const p of players) {
            // Size advantage needed varies by difficulty
            const sizeAdvantage = this.getDifficultyValue(1.3, 1.2, 1.1);
            
            if (p !== this && this.radius > p.radius * sizeAdvantage) {
                const dist = distance(this.x, this.y, p.x, p.y);
                if (dist < closestSmallerPlayerDist && dist < playerDetectionRange) {
                    closestSmallerPlayerDist = dist;
                    closestSmallerPlayer = p;
                }
            }
        }
        
        // Find closest larger player to avoid
        let closestLargerPlayer = null;
        let closestLargerPlayerDist = this.getDifficultyValue(250, 300, 350); // Only care about players within this range
        
        for (const p of players) {
            // Size disadvantage threshold varies by difficulty
            const sizeDisadvantage = this.getDifficultyValue(1.0, 0.9, 0.8);
            
            if (p !== this && this.radius <= p.radius * sizeDisadvantage) {
                const dist = distance(this.x, this.y, p.x, p.y);
                if (dist < closestLargerPlayerDist) {
                    closestLargerPlayerDist = dist;
                    closestLargerPlayer = p;
                }
            }
        }
        
        // Decision making - priority order varies by difficulty
        if (this.difficulty === 'easy') {
            // Easy bots prioritize food and are more cautious
            if (closestLargerEnemy && closestLargerEnemyDist < 200) {
                this.fleeFromEntity(closestLargerEnemy);
            } else if (closestLargerPlayer && closestLargerPlayerDist < 200) {
                this.fleeFromEntity(closestLargerPlayer);
            } else if (closestFood && closestFoodDist < 300) {
                this.chaseEntity(closestFood, 'food');
            } else if (closestSmallerEnemy && closestSmallerEnemyDist < 200) {
                this.chaseEntity(closestSmallerEnemy, 'enemy');
            } else {
                this.wander(worldWidth, worldHeight);
            }
        } else if (this.difficulty === 'hard') {
            // Hard bots are aggressive and prioritize hunting players
            if (closestSmallerPlayer && closestSmallerPlayerDist < 400) {
                this.chaseEntity(closestSmallerPlayer, 'player');
            } else if (closestLargerEnemy && closestLargerEnemyDist < 150) {
                this.fleeFromEntity(closestLargerEnemy);
            } else if (closestLargerPlayer && closestLargerPlayerDist < 150) {
                this.fleeFromEntity(closestLargerPlayer);
            } else if (closestSmallerEnemy && closestSmallerEnemyDist < 300) {
                this.chaseEntity(closestSmallerEnemy, 'enemy');
            } else if (closestFood && closestFoodDist < 400) {
                this.chaseEntity(closestFood, 'food');
            } else {
                this.wander(worldWidth, worldHeight);
            }
        } else {
            // Medium bots have balanced behavior
            if (closestLargerEnemy && closestLargerEnemyDist < 200) {
                this.fleeFromEntity(closestLargerEnemy);
            } else if (closestLargerPlayer && closestLargerPlayerDist < 200) {
                this.fleeFromEntity(closestLargerPlayer);
            } else if (closestSmallerPlayer && closestSmallerPlayerDist < 300) {
                this.chaseEntity(closestSmallerPlayer, 'player');
            } else if (closestSmallerEnemy && closestSmallerEnemyDist < 300) {
                this.chaseEntity(closestSmallerEnemy, 'enemy');
            } else if (closestFood && closestFoodDist < 400) {
                this.chaseEntity(closestFood, 'food');
            } else {
                this.wander(worldWidth, worldHeight);
            }
        }
    }
    
    fleeFromEntity(entity) {
        this.state = 'flee';
        this.fleeingFrom = entity;
        const fleeAngle = angle(entity.x, entity.y, this.x, this.y);
        const fleeDistance = this.getDifficultyValue(250, 300, 350);
        this.targetX = this.x + Math.cos(fleeAngle) * fleeDistance;
        this.targetY = this.y + Math.sin(fleeAngle) * fleeDistance;
    }
    
    chaseEntity(entity, type) {
        this.state = 'chase';
        if (type === 'food') {
            this.targetFood = entity;
        } else {
            this.targetEnemy = entity;
        }
        this.targetX = entity.x;
        this.targetY = entity.y;
    }
    
    wander(worldWidth, worldHeight) {
        this.state = 'wander';
        const wanderDistance = this.getDifficultyValue(200, 300, 400);
        this.targetX = clamp(this.x + random(-wanderDistance, wanderDistance), this.radius, worldWidth - this.radius);
        this.targetY = clamp(this.y + random(-wanderDistance, wanderDistance), this.radius, worldHeight - this.radius);
    }
    
    placeTower(currentTime) {
        // Randomly choose a tower type based on available score and difficulty
        const availableTowers = [];
        
        if (this.score >= 10) availableTowers.push('basic');
        if (this.score >= 25) availableTowers.push('fast');
        if (this.score >= 50) availableTowers.push('heavy');
        
        if (availableTowers.length > 0) {
            let towerType;
            
            // Tower selection strategy based on difficulty
            if (this.difficulty === 'easy') {
                // Easy bots prefer basic towers
                towerType = availableTowers[0];
            } else if (this.difficulty === 'hard') {
                // Hard bots make strategic choices
                if (this.towers.length === 0) {
                    // First tower is basic
                    towerType = 'basic';
                } else if (this.score > 100 && availableTowers.includes('heavy')) {
                    // Prefer heavy towers when rich
                    towerType = 'heavy';
                } else if (availableTowers.includes('fast')) {
                    // Otherwise prefer fast towers
                    towerType = 'fast';
                } else {
                    // Fall back to whatever is available
                    towerType = availableTowers[availableTowers.length - 1];
                }
            } else {
                // Medium bots choose randomly
                towerType = availableTowers[Math.floor(Math.random() * availableTowers.length)];
            }
            
            // Check if we should upgrade or place new
            const existingTower = this.towers.find(tower => tower.type === towerType);
            
            if (existingTower) {
                // Calculate upgrade cost
                let baseCost;
                switch (towerType) {
                    case 'basic': baseCost = 10; break;
                    case 'fast': baseCost = 25; break;
                    case 'heavy': baseCost = 50; break;
                }
                
                const currentLevel = this.towerLevels[towerType];
                const cost = Math.floor(baseCost * (1 + 0.5 * currentLevel));
                
                // Hard bots are more strategic about upgrades
                const shouldUpgrade = this.difficulty === 'hard' 
                    ? (this.score >= cost * 2) // Hard bots save more resources
                    : (this.score >= cost);
                
                if (shouldUpgrade) {
                    // Upgrade tower
                    this.towerLevels[towerType]++;
                    existingTower.upgrade(this.towerLevels[towerType], this.radius);
                    this.score -= cost;
                }
            } else {
                // Place new tower
                let cost;
                switch (towerType) {
                    case 'basic': cost = 10; break;
                    case 'fast': cost = 25; break;
                    case 'heavy': cost = 50; break;
                }
                
                this.addTower(towerType);
                this.score -= cost;
            }
        }
    }
    
    draw(ctx) {
        // Draw bot
        super.draw(ctx);
        
        // Draw bot name
        ctx.fillStyle = '#FFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this.botName, this.x, this.y - this.radius - 5);
        
        // Draw state indicator
        ctx.strokeStyle = this.stateColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw difficulty indicator (small dot)
        let difficultyColor;
        switch(this.difficulty) {
            case 'easy': difficultyColor = '#00FF00'; break; // Green for easy
            case 'medium': difficultyColor = '#FFFF00'; break; // Yellow for medium
            case 'hard': difficultyColor = '#FF0000'; break; // Red for hard
            default: difficultyColor = '#FFFFFF'; break;
        }
        
        ctx.fillStyle = difficultyColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.radius - 12, 3, 0, Math.PI * 2);
        ctx.fill();
    }
} 