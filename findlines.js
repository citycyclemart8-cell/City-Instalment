const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
let start = -1;
let end = lines.length;
lines.forEach((l, i) => {
    if (l.includes('id="customerHistoryModal"')) start = i;
});
console.log(start, end);
