const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  { path: 'dashboard/app/feed/page.tsx', importPath: '../utils/api' },
  { path: 'dashboard/app/fleet/page.tsx', importPath: '../utils/api' },
  { path: 'dashboard/app/falls/page.tsx', importPath: '../utils/api' },
  { path: 'dashboard/app/radars/page.tsx', importPath: '../utils/api' },
  { path: 'dashboard/app/replay/[id]/page.tsx', importPath: '../../utils/api' },
  { path: 'dashboard/app/components/patients/HeatmapSection.tsx', importPath: '../../utils/api' },
  { path: 'dashboard/app/patients/[id]/page.tsx', importPath: '../../utils/api' },
  { path: 'dashboard/app/patients/[id]/communications/page.tsx', importPath: '../../../utils/api' },
  { path: 'dashboard/app/sla/page.tsx', importPath: '../utils/api' }
];

filesToUpdate.forEach(({ path: relPath, importPath }) => {
  const fullPath = path.join(__dirname, 'local-radar-stack', relPath);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  if (content.includes('fetch(') && !content.includes('import { apiFetch }')) {
    content = `import { apiFetch } from "${importPath}";\n` + content;
  }
  
  const regex = /fetch\(/g;
  content = content.replace(regex, 'apiFetch(');
  
  // Now replace apiFetch(`${apiBase}...`) with apiFetch(`...`)
  const fixed = content.split('apiFetch(`${apiBase}').join('apiFetch(`');
  
  fs.writeFileSync(fullPath, fixed);
  console.log(`Updated ${relPath}`);
});
