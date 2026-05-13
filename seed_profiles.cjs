const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('server/database.sqlite');

const profiles = [
    { model: 'YX25-210-840', profile_type: 'corrugated', effective_width: 840, coil_width: 1000, rib_height: 25, pitch: 210, sort_order: 100 },
    { model: 'YX15-225-900', profile_type: 'corrugated', effective_width: 900, coil_width: 1000, rib_height: 15, pitch: 225, sort_order: 95 },
    { model: 'YX25-205-820', profile_type: 'trapezoidal', effective_width: 820, coil_width: 1000, rib_height: 25, pitch: 205, sort_order: 90 },
    { model: 'YX35-125-750', profile_type: 'trapezoidal', effective_width: 750, coil_width: 1000, rib_height: 35, pitch: 125, sort_order: 85 },
    { model: 'YX51-250-750', profile_type: 'trapezoidal', effective_width: 750, coil_width: 1000, rib_height: 51, pitch: 250, sort_order: 80 },
    { model: 'YX65-430', profile_type: 'standing_seam', effective_width: 430, coil_width: 600, rib_height: 65, pitch: 430, sort_order: 75 },
    { model: 'YX65-400', profile_type: 'standing_seam', effective_width: 400, coil_width: 575, rib_height: 65, pitch: 400, sort_order: 70 },
    { model: 'YX28-207-828', profile_type: 'glazed_tile', effective_width: 828, coil_width: 1000, rib_height: 28, pitch: 207, sort_order: 65 },
    { model: 'YX25-200-800', profile_type: 'glazed_tile', effective_width: 800, coil_width: 1000, rib_height: 25, pitch: 200, sort_order: 60 },
    { model: 'YX75-200-600', profile_type: 'decking', effective_width: 600, coil_width: 1000, rib_height: 75, pitch: 200, sort_order: 55 }
];

db.serialize(() => {
    db.run("DELETE FROM roofing_profiles");
    const stmt = db.prepare(`INSERT INTO roofing_profiles (category_id, model, profile_type, effective_width, coil_width, rib_height, pitch, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`);
    profiles.forEach(p => {
        stmt.run(0, p.model, p.profile_type, p.effective_width, p.coil_width, p.rib_height, p.pitch, p.sort_order);
    });
    stmt.finalize();
});

db.close(() => {
    console.log("Database updated successfully.");
});
