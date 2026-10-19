const fs = require('fs');
let css = fs.readFileSync('D:\\arr\\style.css', 'utf8');
// Check for any duplicate CSS rules or repeated properties
let rules = css.split('}');
let ruleCount = 0;
let seenSelectors = {};
let duplicates = [];

rules.forEach(rule => {
    rule = rule.trim();
    if (!rule || !rule.includes('{')) return;
    const selector = rule.substring(0, rule.indexOf('{')).trim();
    if (seenSelectors[selector]) {
        duplicates.push(selector);
    } else {
        seenSelectors[selector] = true;
    }
    ruleCount++;
});

console.log('Total rules:', ruleCount);
console.log('Unique selectors:', Object.keys(seenSelectors).length);
console.log('Potential duplicates:', duplicates.length);
if (duplicates.length > 0) {
    console.log('First 10 duplicates:', duplicates.slice(0, 10));
} else {
    console.log('No duplicate selectors found');
}