/**
 * Main entry point for the game
 */

// Global game instance to track and clean up
let currentGame = null;
let gameLoopId = null;

// Wait for DOM to load
window.addEventListener('DOMContentLoaded', () => {
    // Detect if user is on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    window.isMobile = isMobile;
    
    if (isMobile) {
        console.log("Mobile device detected, adjusting game settings");
    }
    
    // Game menu elements
    const gameMenu = document.getElementById('gameMenu');
    const nicknameInput = document.getElementById('nickname');
    const singlePlayerBtn = document.getElementById('singlePlayerBtn');
    const multiPlayerBtn = document.getElementById('multiPlayerBtn');
    const startGameBtn = document.getElementById('startGameBtn');
    
    // Set default nickname
    nicknameInput.value = "Player" + Math.floor(Math.random() * 1000);
    
    // Game mode selection
    let isMultiplayer = false;
    
    singlePlayerBtn.addEventListener('click', () => {
        singlePlayerBtn.classList.add('active');
        multiPlayerBtn.classList.remove('active');
        isMultiplayer = false;
    });
    
    multiPlayerBtn.addEventListener('click', () => {
        multiPlayerBtn.classList.add('active');
        singlePlayerBtn.classList.remove('active');
        isMultiplayer = true;
    });
    
    // Start game button
    startGameBtn.addEventListener('click', () => {
        // Validate nickname
        let nickname = nicknameInput.value.trim();
        if (!nickname) {
            nickname = "Player" + Math.floor(Math.random() * 1000);
        }
        
        // Set game parameters
        window.playerName = nickname;
        window.enableMultiplayer = isMultiplayer;
        window.botDifficulty = "medium";
        
        // Default bot count - will be adjusted based on player count in multiplayer
        window.botCount = isMobile ? 3 : 5;
        
        // Hide menu and start game
        gameMenu.style.display = 'none';
        
        // Make sure UI elements are visible
        document.getElementById('ui').style.display = 'block';
        document.getElementById('towers').style.display = 'flex';
        
        initGame();
    });
    
    // Initialize game after menu selection
    function initGame() {
        // Clean up any existing game instance
        cleanupGame();
        
        // Get canvas element
        const canvas = document.getElementById('gameCanvas');
        
        // Create game instance
        currentGame = new Game(canvas);
        
        // Game loop variables
        let lastTime = 0;
        
        // Game loop function
        function gameLoop(timestamp) {
            // Calculate delta time
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;
            
            // Update game state
            currentGame.update(timestamp);
            
            // Draw game
            currentGame.draw();
            
            // Request next frame
            gameLoopId = requestAnimationFrame(gameLoop);
        }
        
        // Start game loop
        gameLoopId = requestAnimationFrame(gameLoop);
        
        // Add some instructions to the console
        console.log('Welcome to Blob Warfare, ' + window.playerName + '!');
        console.log('Move your blob with the mouse' + (isMobile ? ' or touch' : '') + '.');
        console.log('Collect food (small dots) to grow and earn points.');
        console.log('Use points to buy towers that will automatically shoot at enemies.');
        console.log('Avoid larger enemy blobs or you will be eaten!');

        // Add event listener for restart button
        document.getElementById('restartBtn').addEventListener('click', () => {
            // Reset game
            if (currentGame.multiplayer) {
                currentGame.multiplayer.disconnect();
            }
            
            // Show menu again
            gameMenu.style.display = 'flex';
            
            // Clean up the current game
            cleanupGame();
        });
        
        // Add event listener for join new room button
        document.getElementById('joinNewRoom').addEventListener('click', () => {
            if (currentGame.multiplayer) {
                currentGame.multiplayer.disconnect();
            }
            
            // Clean up the current game first
            cleanupGame();
            
            // Start a new game
            initGame();
            
            // Try to join a new room
            if (currentGame.multiplayerEnabled) {
                currentGame.initMultiplayer();
            }
        });
        
        // Prevent default touch behavior on canvas for mobile
        if (isMobile) {
            canvas.addEventListener('touchstart', function(e) {
                e.preventDefault();
            }, { passive: false });
            
            canvas.addEventListener('touchend', function(e) {
                e.preventDefault();
            }, { passive: false });
        }
    }
    
    // Function to clean up the current game instance
    function cleanupGame() {
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
        }
        
        if (currentGame) {
            // Disconnect from multiplayer if connected
            if (currentGame.multiplayer && currentGame.multiplayer.isConnected) {
                currentGame.multiplayer.disconnect();
            }
            
            // Clear game references
            currentGame = null;
        }
        
        // Hide game over screen
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('multiplayerOptions').classList.add('hidden');
        
        // Reset score display
        document.getElementById('scoreValue').textContent = '0';
    }
}); 