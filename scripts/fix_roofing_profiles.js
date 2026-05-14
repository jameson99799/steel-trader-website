import { initDb, run, getAll, getOne } from '../server/db.js';

function fixRoofingProfiles() {
    try {
        initDb();
        console.log('Starting roofing profiles data fix and seeding...');

        // 1. Get all categories
        const categories = getAll('SELECT id, name, name_en FROM roofing_categories');
        const catMap = {};
        const catByType = {
            'corrugated': null,
            'trapezoidal': null,
            'standing_seam': null,
            'glazed_tile': null,
            'wall_panel': null
        };

        categories.forEach(c => {
            const enName = (c.name_en || '').toLowerCase();
            catMap[c.id] = c;
            if (enName.includes('corrugated') || c.name.includes('波')) catByType['corrugated'] = c.id;
            else if (enName.includes('trapezoidal') || enName.includes('t-type') || c.name.includes('梯') || c.name.includes('T')) catByType['trapezoidal'] = c.id;
            else if (enName.includes('standing') || enName.includes('seam') || c.name.includes('直立') || c.name.includes('锁')) catByType['standing_seam'] = c.id;
            else if (enName.includes('glazed') || enName.includes('tile') || c.name.includes('琉璃') || c.name.includes('仿古')) catByType['glazed_tile'] = c.id;
            else if (enName.includes('wall') || enName.includes('panel') || c.name.includes('墙')) catByType['wall_panel'] = c.id;
        });

        // 2. Get existing profiles
        const profiles = getAll('SELECT * FROM roofing_profiles');
        
        // 3. Assign unassigned profiles to categories based on their profile_type, and fix PPGI color
        console.log(`Checking ${profiles.length} existing profiles...`);
        let fixedCount = 0;
        
        profiles.forEach(p => {
            let updates = {};
            
            // Assign category
            if (!p.category_id || p.category_id === 0) {
                const targetCat = catByType[p.profile_type];
                if (targetCat) {
                    updates.category_id = targetCat;
                }
            }

            // Fill missing standard data
            if (!p.material) updates.material = (p.surface === 'gi' ? 'Galvanized Steel (GI)' : (p.surface === 'gl' ? 'Aluminum-Zinc Coated Steel (GL)' : 'Pre-Painted Steel (PPGI/PPGL)'));
            if (!p.thickness) updates.thickness = (p.surface === 'ppgi' ? '0.25 - 0.80 mm' : '0.12 - 0.80 mm');
            if (!p.coating) updates.coating = (p.surface === 'gi' ? 'Z60 - Z275' : (p.surface === 'gl' ? 'AZ50 - AZ150' : 'PE / SMP / HDP / PVDF'));
            if (!p.length) updates.length = 'Customizable (Max. 12m)';
            if (!p.applications) updates.applications = 'Roofing, Wall Cladding, Siding';

            // Fix color for PPGI/PPGL
            if (p.surface === 'ppgi' || p.surface === 'ppgl') {
                if (!p.color || !p.color.startsWith('#')) {
                    updates.color = '#003350'; // Default to RAL 5003 Sapphire Blue
                }
            }

            if (Object.keys(updates).length > 0) {
                const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
                const values = Object.values(updates);
                values.push(p.id);
                run(`UPDATE roofing_profiles SET ${setClause} WHERE id = ?`, values);
                fixedCount++;
            }
        });

        console.log(`Fixed ${fixedCount} existing profiles.`);

        // 4. Ensure at least 5 profiles per category
        const idealProfiles = [
            // Corrugated
            { model: 'YX18-76-836', type: 'corrugated', e: 836, c: 1000, h: 18, p: 76, s: 'gi' },
            { model: 'YX18-76-900', type: 'corrugated', e: 900, c: 1000, h: 18, p: 76, s: 'gl' },
            { model: 'YX10-32-800', type: 'corrugated', e: 800, c: 1000, h: 10, p: 32, s: 'ppgi', color: '#AB2B2B' }, // RAL 3000
            { model: 'YX35-125-750', type: 'corrugated', e: 750, c: 1000, h: 35, p: 125, s: 'ppgi', color: '#005387' }, // RAL 5005
            { model: 'YX12-65-850', type: 'corrugated', e: 850, c: 1000, h: 12, p: 65, s: 'gi' },

            // Trapezoidal
            { model: 'YX25-205-820', type: 'trapezoidal', e: 820, c: 1000, h: 25, p: 205, s: 'ppgi', color: '#384C70' }, // RAL 5014
            { model: 'YX25-210-840', type: 'trapezoidal', e: 840, c: 1000, h: 25, p: 210, s: 'gi' },
            { model: 'YX35-200-1000', type: 'trapezoidal', e: 1000, c: 1200, h: 35, p: 200, s: 'gl' },
            { model: 'YX28-207-828', type: 'trapezoidal', e: 828, c: 1000, h: 28, p: 207, s: 'ppgi', color: '#7E2828' }, // RAL 3011
            { model: 'YX15-225-900', type: 'trapezoidal', e: 900, c: 1000, h: 15, p: 225, s: 'ppgi', color: '#E49B09' }, // RAL 1004

            // Standing Seam
            { model: 'YX65-400', type: 'standing_seam', e: 400, c: 600, h: 65, p: 400, s: 'gl' },
            { model: 'YX65-430', type: 'standing_seam', e: 430, c: 600, h: 65, p: 430, s: 'gi' },
            { model: 'YX65-500', type: 'standing_seam', e: 500, c: 600, h: 65, p: 500, s: 'gl' },
            { model: 'YX25-330', type: 'standing_seam', e: 330, c: 500, h: 25, p: 330, s: 'ppgi', color: '#8E9CB0' }, // RAL 7040
            { model: 'YX25-430', type: 'standing_seam', e: 430, c: 600, h: 25, p: 430, s: 'ppgi', color: '#4E545B' }, // RAL 7015

            // Glazed Tile
            { model: 'YX28-207-828', type: 'glazed_tile', e: 828, c: 1000, h: 28, p: 207, s: 'ppgi', color: '#C01B1B' }, // RAL 3020
            { model: 'YX25-200-800', type: 'glazed_tile', e: 800, c: 1000, h: 25, p: 200, s: 'ppgi', color: '#883232' }, // RAL 3004
            { model: 'YX30-160-800', type: 'glazed_tile', e: 800, c: 1000, h: 30, p: 160, s: 'ppgi', color: '#3A4631' }, // RAL 6009
            { model: 'YX26-170-850', type: 'glazed_tile', e: 850, c: 1000, h: 26, p: 170, s: 'ppgi', color: '#1B5540' }, // RAL 6024
            { model: 'YX24-210-840', type: 'glazed_tile', e: 840, c: 1000, h: 24, p: 210, s: 'ppgi', color: '#F24E00' }, // RAL 2004

            // Wall Panel
            { model: 'YX15-225-900', type: 'wall_panel', e: 900, c: 1000, h: 15, p: 225, s: 'ppgi', color: '#E7E1CB' }, // RAL 1013
            { model: 'YX10-130-910', type: 'wall_panel', e: 910, c: 1000, h: 10, p: 130, s: 'ppgi', color: '#BB8A3A' }, // RAL 1011
            { model: 'YX35-125-750', type: 'wall_panel', e: 750, c: 1000, h: 35, p: 125, s: 'gl' },
            { model: 'YX25-210-840', type: 'wall_panel', e: 840, c: 1000, h: 25, p: 210, s: 'gi' },
            { model: 'YX18-76-900', type: 'wall_panel', e: 900, c: 1000, h: 18, p: 76, s: 'ppgi', color: '#D2B773' }, // RAL 1001
        ];

        let addedCount = 0;
        const currentProfiles = getAll('SELECT * FROM roofing_profiles');
        
        for (const pt of ['corrugated', 'trapezoidal', 'standing_seam', 'glazed_tile', 'wall_panel']) {
            const catId = catByType[pt];
            if (!catId) continue; // If category doesn't exist, skip
            
            const existingInCat = currentProfiles.filter(p => p.category_id === catId || p.profile_type === pt);
            const needed = 5 - existingInCat.length;
            
            if (needed > 0) {
                console.log(`Category ${pt} has ${existingInCat.length} profiles. Adding ${needed} more...`);
                const candidates = idealProfiles.filter(i => i.type === pt && !existingInCat.some(e => e.model === i.model));
                
                for (let i = 0; i < Math.min(needed, candidates.length); i++) {
                    const c = candidates[i];
                    const material = c.s === 'gi' ? 'Galvanized Steel (GI)' : (c.s === 'gl' ? 'Aluminum-Zinc Coated Steel (GL)' : 'Pre-Painted Steel (PPGI/PPGL)');
                    const thickness = c.s === 'ppgi' ? '0.25 - 0.80 mm' : '0.12 - 0.80 mm';
                    const coating = c.s === 'gi' ? 'Z60 - Z275' : (c.s === 'gl' ? 'AZ50 - AZ150' : 'PE / SMP / HDP / PVDF');
                    const color = c.color || '';
                    
                    run(`
                        INSERT INTO roofing_profiles (
                            model, profile_type, effective_width, coil_width, rib_height, pitch, surface, color, sort_order, category_id,
                            material, thickness, coating, length, applications
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        c.model, c.type, c.e, c.c, c.h, c.p, c.s, color, 100 - i, catId,
                        material, thickness, coating, 'Customizable (Max. 12m)', 'Roofing, Wall Cladding, Siding'
                    ]);
                    addedCount++;
                }
            }
        }

        console.log(`Added ${addedCount} new profiles to ensure 5 per category.`);
        console.log('Roofing profiles data fix completed successfully.');

    } catch (e) {
        console.error('Error fixing roofing profiles:', e);
    }
}

fixRoofingProfiles();
