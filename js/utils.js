/**
 * Utility functions for the game
 */

// Calculate distance between two points
function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Generate a random number between min and max (inclusive)
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a random color
function randomColor() {
    const hue = random(0, 360);
    return `hsl(${hue}, 70%, 60%)`;
}

// Check if two circles are colliding
function circleCollision(x1, y1, r1, x2, y2, r2) {
    return distance(x1, y1, x2, y2) < r1 + r2;
}

// Clamp a value between min and max
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Calculate angle between two points
function angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

// Convert angle to vector
function angleToVector(angle) {
    return {
        x: Math.cos(angle),
        y: Math.sin(angle)
    };
} 