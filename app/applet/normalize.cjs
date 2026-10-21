const fs = require('fs');
const file = 'src/components/tabs/MonthlyControlTab.tsx';
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
fs.writeFileSync(file, content, 'utf8');
console.log('NORMALIZED');
