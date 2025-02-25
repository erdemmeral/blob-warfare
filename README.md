# Blob Warfare

A browser-based game inspired by agar.io with tower defense elements. Control your blob, collect food, place defensive towers, and avoid being eaten by enemies or other players!

## Features

- **Blob Movement**: Control your blob with mouse movement or touch on mobile
- **Food Collection**: Collect food dots to grow larger and earn points
- **Enemy Blobs**: Avoid larger enemy blobs or eat smaller ones
- **Tower Defense**: Place towers that automatically shoot at enemies
  - Basic Tower: Balanced damage and fire rate (10 points)
  - Fast Tower: Rapid fire but lower damage (25 points)
  - Heavy Tower: High damage but slow fire rate (50 points)
- **Size Mechanics**: Larger blobs move slower but can eat smaller ones
- **Bot AI**: Play against AI-controlled bots with different difficulty levels
- **Multiplayer**: Play with other players in real-time
  - Join game rooms with other players
  - Compete or cooperate with real players
  - Towers can target other players if they're smaller than you
- **Mobile Support**: Play on your smartphone or tablet with touch controls

## How to Play

1. Enter your nickname when prompted
2. Choose the number of bots and their difficulty
3. Decide whether to play in single-player or multiplayer mode
4. Control your blob with the mouse (or touch on mobile)
5. Collect food (small dots) to grow and earn points
6. Use points to place towers by clicking the buttons or using number keys (on desktop):
   - Basic Tower: Press 1 or tap button (10 points)
   - Fast Tower: Press 2 or tap button (25 points)
   - Heavy Tower: Press 3 or tap button (50 points)
7. Avoid larger enemy blobs and other players
8. Try to become the largest blob in the game!

## Mobile Play

The game is fully playable on mobile devices:
- Use touch to move your blob
- Tap the tower buttons at the bottom of the screen to place towers
- The game automatically adjusts difficulty and world size for better mobile experience

## Multiplayer Setup

To play the multiplayer version:

1. Choose "Yes" when asked if you want to play multiplayer
2. The game will automatically connect you to a room with other players
3. If you die, you can join a new room by clicking "Join New Room"

## Development

This game uses vanilla JavaScript with HTML5 Canvas for rendering. The multiplayer functionality is implemented using Netlify Functions for the backend.

To run the game locally with multiplayer support:

1. Install dependencies: `npm install`
2. Run the development server: `npm run dev`

## Credits

Created as a learning project combining elements from popular .io games with tower defense mechanics. 