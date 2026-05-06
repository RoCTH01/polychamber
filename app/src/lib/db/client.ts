import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

// singleton for Next.js hot-reload
const globalForDb = global as unknown as { pgClient: postgres.Sql }

const client = globalForDb.pgClient ?? postgres(connectionString, { prepare: false })
if (process.env.NODE_ENV !== 'production') globalForDb.pgClient = client

export const db = drizzle(client, { schema })
