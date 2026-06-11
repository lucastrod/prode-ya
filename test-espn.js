async function main() {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'; 
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    // Save output to file to easily show user
    const fs = require('fs');
    fs.writeFileSync('espn-output.json', JSON.stringify(data.events[0], null, 2));
    console.log('Saved 1 event to espn-output.json');
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

main();
