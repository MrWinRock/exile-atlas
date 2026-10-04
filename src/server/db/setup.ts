import { setupDatabase, closeDatabase } from "../storage";
await setupDatabase();
console.log("PostgreSQL schema is ready.");
await closeDatabase();
