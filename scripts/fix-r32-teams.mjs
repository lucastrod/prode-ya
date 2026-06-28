/**
 * Script to fix prode-ya Round of 32 matches:
 * 1. Fetch all current prode-ya R32 matches
 * 2. Update IDs 106-121 with real team names from prode-ser
 * 3. Delete old stub IDs 73-88
 */

const BASE_URL = 'https://prode-ya.vercel.app';

// Real team matchups derived from prode-ser (in date order)
// Mapping: prode-ya new match ID → real teams
const REAL_TEAMS = {
  106: { homeTeam: 'Sudáfrica', awayTeam: 'Canadá' },
  107: { homeTeam: 'Alemania', awayTeam: 'Paraguay' },
  108: { homeTeam: 'Países Bajos', awayTeam: 'Marruecos' },
  109: { homeTeam: 'Brasil', awayTeam: 'Japón' },
  110: { homeTeam: 'Francia', awayTeam: 'Suecia' },
  111: { homeTeam: 'Costa de Marfil', awayTeam: 'Noruega' },
  112: { homeTeam: 'México', awayTeam: 'Ecuador' },
  113: { homeTeam: 'Inglaterra', awayTeam: 'RD Congo' },
  114: { homeTeam: 'Estados Unidos', awayTeam: 'Bosnia y Herzegovina' },
  115: { homeTeam: 'Bélgica', awayTeam: 'Senegal' },
  116: { homeTeam: 'Portugal', awayTeam: 'Croacia' },
  117: { homeTeam: 'España', awayTeam: 'Austria' },
  118: { homeTeam: 'Suiza', awayTeam: 'Argelia' },
  119: { homeTeam: 'Argentina', awayTeam: 'Cabo Verde' },
  120: { homeTeam: 'Colombia', awayTeam: 'Ghana' },
  121: { homeTeam: 'Australia', awayTeam: 'Egipto' },
};

const OLD_STUBS = [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88];

async function main() {
  // 1. Fetch all matches
  console.log('Fetching matches from prode-ya...');
  const res = await fetch(`${BASE_URL}/api/matches`);
  const data = await res.json();
  const allMatches = data.matches || [];
  const r32 = allMatches.filter(m => m.stage === 'ROUND_32');
  console.log(`Found ${r32.length} R32 matches.`);

  // 2. Update real team names
  for (const [idStr, teams] of Object.entries(REAL_TEAMS)) {
    const id = parseInt(idStr);
    const match = r32.find(m => m.id === id);
    if (!match) {
      console.log(`⚠️  Match ID ${id} not found, skipping.`);
      continue;
    }

    console.log(`Updating ID ${id}: ${match.homeTeam} vs ${match.awayTeam} → ${teams.homeTeam} vs ${teams.awayTeam}`);
    
    const updateRes = await fetch(`${BASE_URL}/api/admin/matches`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        homeTeam: teams.homeTeam,
        awayTeam: teams.awayTeam,
        matchDate: match.matchDate,
        groupName: match.groupName,
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      }),
    });

    if (updateRes.ok) {
      console.log(`  ✅ Updated ID ${id}`);
    } else {
      const err = await updateRes.json();
      console.log(`  ❌ Failed ID ${id}:`, err.error || 'unknown error');
    }
  }

  // 3. Delete old stub matches (IDs 73-88)
  console.log('\nDeleting old stub matches...');
  for (const id of OLD_STUBS) {
    const match = r32.find(m => m.id === id);
    if (!match) {
      console.log(`  ⚠️  Stub ID ${id} not found, skipping.`);
      continue;
    }
    console.log(`  Deleting stub ID ${id}: ${match.homeTeam} vs ${match.awayTeam}`);
    
    const delRes = await fetch(`${BASE_URL}/api/admin/matches?id=${id}`, {
      method: 'DELETE',
    });

    if (delRes.ok) {
      console.log(`    ✅ Deleted ID ${id}`);
    } else {
      const err = await delRes.json().catch(() => ({}));
      console.log(`    ❌ Failed to delete ID ${id}:`, err.error || 'unknown error');
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
