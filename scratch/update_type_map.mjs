import fs from 'fs';

function updateFile(file) {
    let t = fs.readFileSync(file, 'utf8');
    // We are replacing "futures: 'futures'" with "futures: 'futures', futures_watchlist: 'futures'"
    // This handles TYPE_TO_PAGE maps where futures is already there.
    let count = 0;
    t = t.replace(/futures:\s*'futures'/g, () => {
        count++;
        return "futures: 'futures', futures_watchlist: 'futures'";
    });
    fs.writeFileSync(file, t);
    console.log(`Updated ${file}, replaced ${count} occurrences.`);
}

updateFile('server/routes/translation.js');
updateFile('server/routes/translation-jobs.js');
