import fs from 'fs';

const logPath = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\526de08c-b510-4d69-8c6e-28c8ab821f5a\\.system_generated\\logs\\overview.txt';
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const parsed = JSON.parse(line);
        if (parsed.source === 'USER_EXPLICIT' || parsed.type === 'USER_INPUT') {
            console.log(`--- STEP ${parsed.step_index} (${parsed.created_at}) ---`);
            console.log(JSON.stringify(parsed));
        }
    } catch (e) {
    }
}
