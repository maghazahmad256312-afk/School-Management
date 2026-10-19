const fs = require('fs');
let script = fs.readFileSync('D:\\arr\\script.js', 'utf8');
let lines = script.split('\n');

// Track the init() function execution
let inInit = false;
let initStartLine = -1;
let braceCount = 0;

lines.forEach((line, i) => {
    // Find the start of the main IIFE's init() function
    // (not the Students/Teachers dashboard blocks at the end)
    if (line.includes("'use strict';") && i > 0 && lines[i-1].trim() === '') {
        // Check if this is the main init() by looking for initLoginPage nearby
        let foundInitLogin = false;
        for (let j = Math.max(0, i-50); j <= i+50; j++) {
            if (j < lines.length && lines[j].includes('initLoginPage')) {
                foundInitLogin = true;
                break;
            }
        }
        if (foundInitLogin) {
            inInit = true;
            initStartLine = i;
            console.log('Found main init() at line', i+1);
        }
    }
});

// Now trace the init() function
let init braceCount = 0;
let inInitFunc = false;

lines.forEach((line, i) => {
    if (line.includes("function init()") && i > 500 && i < 700) {
        inInitFunc = true;
        console.log('init() function found at line', i+1);
    }
    if (inInitFunc) {
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match/\}/g) || []).length;
        if (braceCount === 0 && inInitFunc) {
            console.log('init() block ends at line', i+1);
            console.log('Total lines in init():', i - initStartLine + 1);
            inInitFunc = false;
        }
    }
});