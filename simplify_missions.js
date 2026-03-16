const fs = require('fs');
const path = 'src/components/dashboard/MissionList.tsx';
let content = fs.readFileSync(path, 'utf8');

// Regex to remove the status labels (Misión Cumplida / En Curso)
const statusRegex = /<span style={{[^]*?fontSize: '0\.65rem'[^]*?{mission\.completed \? 'Misión Cumplida' : 'En Curso'}\s*<\/span>/g;
content = content.replace(statusRegex, '');

// Regex to remove the Q label badge
const qRegex = /<span style={{[^]*?fontSize: '0\.6rem'[^]*?{mission\.q}\s*<\/span>/g;
content = content.replace(qRegex, '');

fs.writeFileSync(path, content);
console.log('Labels removed successfully');
