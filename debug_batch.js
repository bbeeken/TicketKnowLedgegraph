const fs = require('fs');

function splitOnGoBatches(sqlText) {
  const lines = sqlText.replace(/\r\n/g, '\n').split('\n');
  const batches = [];
  let current = [];
  for (const line of lines) {
    if (/^\s*GO\s*$/i.test(line)) {
      if (current.length) batches.push(current.join('\n'));
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) batches.push(current.join('\n'));
  return batches.filter((b) => b.trim().length > 0);
}

const sqlContent = fs.readFileSync('01_app_relational_core.sql', 'utf8');
const batches = splitOnGoBatches(sqlContent);

console.log(`Total batches: ${batches.length}`);
console.log(`\n=== BATCH 35 ===`);
console.log(batches[34]); // 0-indexed, so 34 is batch 35
console.log(`\n=== BATCH 34 ===`);
console.log(batches[33]); // Also check the previous batch
