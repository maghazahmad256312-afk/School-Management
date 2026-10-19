const fs = require('fs');
let css = fs.readFileSync('D:\\arr\\style.css', 'utf8');
let lines = css.split('\n');
let issues = [];
lines.forEach((line, i) => {
    // Check for property without value (colon at end, no semicolon)
    if (line.trim() && line.includes(':') && !line.includes('{') && !line.includes('}') && !line.startsWith('/*') && !line.startsWith('* {') && !line.startsWith(':root') && !line.startsWith('html') && !line.includes('--')) {
        const colonPos = line.indexOf(':');
        const prop = line.substring(0, colonPos).trim();
        const val = line.substring(colonPos + 1).trim();
        if (!val) {
            issues.push({line: i+1, text: 'Property "' + prop + '" has no value'});
        }
    }
    // Check for multiple colons without semicolon in suspicious places
    if (line.match(/:[^:]+:\s*$/)) {
        issues.push({line: i+1, text: 'Double colon pattern at end of line'});
    }
});
console.log('Total issues:', issues.length);
issues.slice(0, 20).forEach(i => console.log('Line ' + i.line + ': ' + i.text));
if (issues.length === 0) console.log('No issues found');