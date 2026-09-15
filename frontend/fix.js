const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  if (content.includes('\\${') || content.includes('\\`')) {
    content = content.replace(/\\\${/g, '${').replace(/\\`/g, '`');
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  }
});
