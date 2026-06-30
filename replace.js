const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const newModalHtml = fs.readFileSync('modal.html', 'utf8');

const startStr = '<!-- Customer Payment History Modal -->';
const endStr = '<!-- View Customer Modal -->';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find start or end bounds in index.html');
    process.exit(1);
}

const newContent = content.substring(0, startIdx) + newModalHtml + "\n    " + content.substring(endIdx);

fs.writeFileSync('index.html', newContent, 'utf8');
console.log("Successfully replaced modal HTML.");
