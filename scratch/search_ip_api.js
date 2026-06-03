import fs from 'fs';

const logPath = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\526de08c-b510-4d69-8c6e-28c8ab821f5a\\.system_generated\\logs\\overview.txt';
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const parsed = JSON.parse(line);
        const str = JSON.stringify(parsed);
        if (str.includes('ip9') || str.includes('ip-api') || str.includes('ipapi') || str.includes('country')) {
            console.log(`--- STEP ${parsed.step_index} (${parsed.created_at}) ---`);
            console.log(str.slice(0, 1000));
        }
    } catch (e) {
    }
}
