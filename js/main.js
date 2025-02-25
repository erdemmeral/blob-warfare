/**
 * Main entry point for the game
 */

// Wait for DOM to load
window.addEventListener('DOMContentLoaded', () => {
    // Get player nickname
    let nickname = prompt("Enter your nickname:", "Player");
    if (!nickname || nickname.trim() === "") {
        nickname = "Player";
    }
    window.playerName = nickname;
    
    // Ask for bot count
    let botCount = prompt("How many bots do you want to play against? (1-10)", "3");
    botCount = parseInt(botCount);
    if (isNaN(botCount) || botCount < 1 || botCount > 10) {
        botCount = 3;
        console.log("Invalid bot count. Using default: 3 bots");
    } else {
        console.log(`You will play against ${botCount} bots`);
    }
    window.botCount = botCount;
    
    // Ask for bot difficulty
    let botDifficulty = prompt("Choose bot difficulty (easy, medium, hard):", "medium");
    if (!["easy", "medium", "hard"].includes(botDifficulty.toLowerCase())) {
        botDifficulty = "medium";
        console.log("Invalid difficulty. Using default: medium");
    } else {
        console.log(`Bot difficulty set to: ${botDifficulty}`);
    }
    window.botDifficulty = botDifficulty.toLowerCase();
    
    // Ask if player wants to play multiplayer
    let enableMultiplayer = confirm("Do you want to play multiplayer? (OK for Yes, Cancel for No)");
    window.enableMultiplayer = enableMultiplayer;
    console.log(`Multiplayer mode: ${enableMultiplayer ? "Enabled" : "Disabled"}`);
    
    // Get canvas element
    const canvas = document.getElementById('gameCanvas');
    
    // Create game instance
    const game = new Game(canvas);
    
    // Game loop variables
    let lastTime = 0;
    let animationFrameId;
    
    // Game loop function
    function gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        
        // Update game state
        game.update(timestamp);
        
        // Draw game
        game.draw();
        
        // Request next frame
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    // Start game loop
    animationFrameId = requestAnimationFrame(gameLoop);
    
    // Add some instructions to the console
    console.log('Welcome to Blob Warfare, ' + nickname + '!');
    console.log('You are playing against ' + botCount + ' ' + botDifficulty + ' bots.');
    console.log('Move your blob with the mouse.');
    console.log('Collect food (small dots) to grow and earn points.');
    console.log('Use points to buy towers that will automatically shoot at enemies.');
    console.log('Avoid larger enemy blobs or you will be eaten!');

    // Add event listener for restart button
    document.getElementById('joinNewRoom').addEventListener('click', () => {
        if (game.multiplayer) {
            game.multiplayer.disconnect();
        }
        location.reload();
    });
}); 