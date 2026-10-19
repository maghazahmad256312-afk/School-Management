const fs = require('fs');
let css = fs.readFileSync('D:\\arr\\style.css', 'utf8');
// Remove comments for analysis
let cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
let lines = cssNoComments.split('\n');
let issues = [];
let multiLineProps = [];

lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Skip empty lines, braces, at-rules, variables, comments
    if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('}') || 
        trimmed.startsWith('@') || trimmed.startsWith('--') || trimmed.startsWith('/*')) return;
    
    // Check for property: value; pattern
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
        const prop = trimmed.substring(0, colonIdx).trim();
        const afterColon = trimmed.substring(colonIdx + 1).trim();
        
        // Property without semicolon and without closing brace on same line
        if (!afterColon.endsWith(';') && !afterColon.endsWith('!important')) {
            // Check if it's a multi-line property (values on subsequent lines)
            const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
            if (nextLine && !nextLine.startsWith('{') && !nextLine.startsWith('}') && 
                !nextLine.startsWith('@') && !nextLine.startsWith('--') && nextLine.length > 0) {
                // This could be a multi-line property
                multiLineProps.push({line: i + 1, prop: prop, nextLine: nextLine});
            } else {
                issues.push({line: i + 1, prop: prop, text: 'Property missing semicolon'});
            }
        }
    }
});

console.log('Issues:', issues.length);
issues.slice(0, 10).forEach(i => console.log('Line ' + i.line + ': ' + i.prop + ' - ' + i.text));
console.log('Multi-line props:', multiLineProps.length);
multiLineProps.slice(0, 5).forEach(i => console.log('Line ' + i.line + ': ' + i.prop + ' - multi-line value starting with: ' + i.nextLine.substring(0, 50)));