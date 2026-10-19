const fs = require('fs');
let css = fs.readFileSync('D:\\arr\\style.css', 'utf8');
console.log('File size:', css.length, 'bytes');
console.log('Total lines:', css.split('\n').length);
const lines = css.split('\n');
let lastNonEmpty = 'empty';
for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim()) {
        lastNonEmpty = lines[i];
        break;
    }
}
console.log('Last non-empty line:', lastNonEmpty);