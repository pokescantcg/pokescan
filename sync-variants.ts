async function main() {
  const { db } = await import('./server/db');
  const { pokemonCards } = await import('@shared/schema');
  const { syncVariantsFromTcgApi } = await import('./server/scrydex-scraper');
  const sets = await db.selectDistinct({ setId: pokemonCards.setId }).from(pokemonCards);
  for (const row of sets) {
    if (!row.setId) continue;
    console.log('Syncing', row.setId);
    try {
      await syncVariantsFromTcgApi(row.setId, console.log);
    } catch (e: any) {
      console.error('Failed:', row.setId, e.message);
    }
  }
  process.exit(0);
}
main();