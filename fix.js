const fs = require('fs');
let content = fs.readFileSync('app/api/train.ts', 'utf8');

const fetchErailStr = `// Fetch dynamic route from erail
async function fetchDynamicRoute`;

const saveStr = `// Save learned route to cache
async function saveLearnedRoute`;

const startIndex = content.indexOf(fetchErailStr);
const endIndex = content.indexOf(saveStr);

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.substring(0, startIndex) +
`// Get learned route from cache (pre-seeded + live-learned)
async function getLearnedRoute(trainNo: string) {
    try {
        const filePath = path.join(ROUTE_CACHE_DIR, \`\${trainNo}.json\`);
        const data = await fs.readFile(filePath, 'utf8');
        const json = JSON.parse(data);
        if (json[trainNo] && Object.keys(json[trainNo]).length > 0) {
            return json[trainNo];
        }
        return {};
    } catch {
        return {};
    }
}

` + content.substring(endIndex);

    fs.writeFileSync('app/api/train.ts', newContent);
    console.log("Done");
} else {
    console.log("Not found", startIndex, endIndex);
}
