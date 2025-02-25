// Game server function for Blob Warfare
const { v4: uuidv4 } = require('uuid');

// In-memory game state (note: this will reset when the function cold starts)
// For production, use a database like FaunaDB or DynamoDB
let gameState = {
  players: {},
  rooms: {},
  activeGames: {}
};

// Helper to create a new game room
function createRoom() {
  const roomId = uuidv4().substring(0, 8);
  gameState.rooms[roomId] = {
    id: roomId,
    players: [],
    created: Date.now(),
    gameConfig: {
      worldWidth: 2000,
      worldHeight: 2000,
      enemySpawnRate: 3000,
      foodSpawnRate: 1000
    }
  };
  return roomId;
}

// Main handler for the serverless function
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Parse the request body
  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  // Handle different action types
  const action = data.action || '';

  switch (action) {
    case 'ping':
      // Simple ping to keep connection alive
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'ok', timestamp: Date.now() })
      };

    case 'createPlayer':
      // Create a new player
      const playerId = uuidv4();
      const { nickname, botCount, botDifficulty } = data;
      
      gameState.players[playerId] = {
        id: playerId,
        nickname: nickname || 'Player',
        lastSeen: Date.now(),
        botCount: botCount || 3,
        botDifficulty: botDifficulty || 'medium'
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          playerId,
          message: `Welcome, ${nickname}!` 
        })
      };

    case 'joinRoom':
      // Join an existing room or create a new one
      const { playerId: playerToJoin } = data;
      
      if (!gameState.players[playerToJoin]) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Player not found' })
        };
      }
      
      // Find an available room or create a new one
      let roomToJoin = data.roomId;
      
      if (!roomToJoin || !gameState.rooms[roomToJoin]) {
        // Find a room with space or create a new one
        const availableRooms = Object.values(gameState.rooms).filter(
          room => room.players.length < 10 && Date.now() - room.created < 3600000 // 1 hour max age
        );
        
        if (availableRooms.length > 0) {
          roomToJoin = availableRooms[0].id;
        } else {
          roomToJoin = createRoom();
        }
      }
      
      // Add player to room if not already in
      if (!gameState.rooms[roomToJoin].players.includes(playerToJoin)) {
        gameState.rooms[roomToJoin].players.push(playerToJoin);
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          roomId: roomToJoin,
          players: gameState.rooms[roomToJoin].players.map(id => ({
            id,
            nickname: gameState.players[id]?.nickname || 'Unknown'
          })),
          gameConfig: gameState.rooms[roomToJoin].gameConfig
        })
      };

    case 'updatePlayerState':
      // Update a player's state (position, score, etc.)
      const { playerId: playerToUpdate, roomId, playerState } = data;
      
      if (!gameState.players[playerToUpdate]) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Player not found' })
        };
      }
      
      if (!gameState.rooms[roomId]) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Room not found' })
        };
      }
      
      // Update player's last seen timestamp
      gameState.players[playerToUpdate].lastSeen = Date.now();
      
      // Store player state in the active game
      if (!gameState.activeGames[roomId]) {
        gameState.activeGames[roomId] = {
          playerStates: {},
          lastUpdated: Date.now()
        };
      }
      
      gameState.activeGames[roomId].playerStates[playerToUpdate] = {
        ...playerState,
        lastUpdated: Date.now()
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'ok' })
      };

    case 'getGameState':
      // Get the current state of a game room
      const { roomId: roomToGet } = data;
      
      if (!gameState.rooms[roomToGet]) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Room not found' })
        };
      }
      
      // Clean up inactive players (not seen in the last 30 seconds)
      const now = Date.now();
      gameState.rooms[roomToGet].players = gameState.rooms[roomToGet].players.filter(
        id => now - (gameState.players[id]?.lastSeen || 0) < 30000
      );
      
      // Get player states for active players
      const playerStates = gameState.activeGames[roomToGet]?.playerStates || {};
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          players: gameState.rooms[roomToGet].players.map(id => ({
            id,
            nickname: gameState.players[id]?.nickname || 'Unknown',
            state: playerStates[id] || null
          })),
          timestamp: Date.now()
        })
      };

    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Unknown action' })
      };
  }
}; 