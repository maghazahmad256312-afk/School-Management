const fs = require('fs');
let css = fs.readFileSync('D:\\arr\\style.css', 'utf8');
// Remove comments
css = css.replace(/\/\*[\s\S]*?\*\//g, '');
let open = (css.match(/\{/g) || []).length;
let close = (css.match(/\}/g) || []).length;
console.log('Braces: open=' + open + ' close=' + close);
let atRules = css.match(/@[^{]+{/g) || [];
console.log('@rules found: ' + atRules.length);
let urls = (css.match(/url\([^)]+\)/g) || []);
console.log('url() found: ' + urls.length);