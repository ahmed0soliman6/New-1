const fs = require('fs');
const path = require('path');

// Helper to recursively get files
function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(getFiles(file));
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = getFiles('./src');

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Let's do a simple scan for conditional returns followed by hooks in the same component function
  // We can track the current function and see if there is a return statement followed by a hook call (like useState, useEffect, etc.) at the same nesting level
  let currentFunc = null;
  let hasReturn = false;
  let indentOfReturn = null;
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Check if function declaration
    if (line.includes('function ') || line.includes('const ') && line.includes('=>') && (line.includes('React.FC') || line.includes('Component') || line.includes('Screen'))) {
      currentFunc = trimmed;
      hasReturn = false;
      indentOfReturn = null;
    }
    
    // If we see a hook
    if (trimmed.startsWith('const [') && (trimmed.includes('useState') || trimmed.includes('useMemo') || trimmed.includes('useRef') || trimmed.includes('useEffect') || trimmed.includes('useTransition'))) {
      if (hasReturn) {
        console.log(`[CONDITIONAL HOOK POTENTIAL] File: ${filePath}:${index + 1}`);
        console.log(`  Line: ${line}`);
        console.log(`  Reason: Hook called after a return statement inside ${currentFunc}`);
      }
    }
    
    // If we see a top-level return (at the start of a block)
    if (trimmed.startsWith('if (') && trimmed.includes('return ')) {
      hasReturn = true;
    }
    if (trimmed === 'return;' || trimmed === 'return null;' || trimmed === 'return [];' || trimmed === 'return {};') {
      hasReturn = true;
    }
  });
});

console.log('Audit completed!');
