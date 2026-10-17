// Verifies the Leaguepedia bot-password setup: logs in and runs one small Cargo query (never prints secrets).
import { login, cargoQuery } from './lib/leaguepedia.js';

try {
  const user = await login();
  console.log(user ? `✓ Zalogowano jako ${user}` : '… brak danych logowania, test anonimowy');
  const rows = await cargoQuery({ tables: 'Players', fields: 'ID,Name,NativeName,Team,Role,IsRetired', where: "ID='Faker'", fresh: true });
  console.log(rows.length ? `✓ Cargo działa: ${JSON.stringify(rows[0])}` : '✗ Cargo zwróciło 0 wierszy');
} catch (e) {
  console.error('✗ ' + e.message);
  process.exitCode = 1;
}
