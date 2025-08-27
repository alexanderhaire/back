import { IAgentRuntime, elizaLogger } from "@elizaos/core";

export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // This will be hashed
  createdAt: Date;
  updatedAt: Date;
}

export class UserDatabase {
  private dbAdapter: any;
  private isPostgres: boolean;

  constructor(databaseAdapter: any) {
    this.dbAdapter = databaseAdapter;
    // Check if this is a PostgreSQL adapter
    this.isPostgres = !!databaseAdapter.query || !!databaseAdapter.connectionString;
  }

  async initialize() {
    await this.initializeUsersTable();
  }

  private async initializeUsersTable() {
    try {
      // Create users table if it doesn't exist
      const sql = `
        CREATE TABLE IF NOT EXISTS users (
            id TEXT NOT NULL,
            username TEXT NOT NULL,
            email TEXT NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT users_username_unique UNIQUE (username),
            CONSTRAINT users_email_unique UNIQUE (email),
            CONSTRAINT users_pk PRIMARY KEY (id)
        );
      `;
      
      await this.executeQuery(sql);
      elizaLogger.info("Users table initialized successfully");
    } catch (error) {
      // If table already exists, that's OK
      if (error.message && (error.message.includes('already exists') || error.message.includes('relation') && error.message.includes('already exists'))) {
        elizaLogger.info("Users table already exists");
        return;
      }
      elizaLogger.error("Error initializing users table:", error);
      throw error;
    }
  }

  private async executeQuery(sql: string, params: any[] = []): Promise<any> {
    try {
      if (this.isPostgres) {
        // For PostgreSQL adapter
        if (this.dbAdapter.query) {
          return await this.dbAdapter.query(sql, params);
        } else if (this.dbAdapter.db && this.dbAdapter.db.query) {
          return await this.dbAdapter.db.query(sql, params);
        } else {
          throw new Error("PostgreSQL query method not found");
        }
      } else {
        // For SQLite adapter
        const db = this.dbAdapter.db || this.dbAdapter;
        if (db.prepare) {
          return await db.prepare(sql).run(...params);
        } else if (db.run) {
          return await db.run(sql, params);
        } else {
          throw new Error("SQLite query method not found");
        }
      }
    } catch (error) {
      elizaLogger.error("Error executing query:", error);
      throw error;
    }
  }

  private async queryRow(sql: string, params: any[] = []): Promise<any> {
    try {
      if (this.isPostgres) {
        // For PostgreSQL adapter
        let result;
        if (this.dbAdapter.query) {
          result = await this.dbAdapter.query(sql, params);
        } else if (this.dbAdapter.db && this.dbAdapter.db.query) {
          result = await this.dbAdapter.db.query(sql, params);
        } else {
          throw new Error("PostgreSQL query method not found");
        }
        return result.rows && result.rows.length > 0 ? result.rows[0] : null;
      } else {
        // For SQLite adapter
        const db = this.dbAdapter.db || this.dbAdapter;
        if (db.prepare) {
          return await db.prepare(sql).get(...params);
        } else if (db.get) {
          return await db.get(sql, params);
        } else {
          throw new Error("SQLite query method not found");
        }
      }
    } catch (error) {
      elizaLogger.error("Error querying row:", error);
      throw error;
    }
  }

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const id = this.generateUserId();
      const now = new Date();
      
      // Use parameterized query
      const sql = `
        INSERT INTO users (id, username, email, password, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      const params = [
        id,
        user.username,
        user.email,
        user.password,
        now.toISOString(),
        now.toISOString()
      ];

      // For SQLite, convert $1, $2, etc. to ? placeholders
      const sqliteSQL = this.isPostgres ? sql : sql.replace(/\$(\d+)/g, '?');
      
      await this.executeQuery(sqliteSQL, params);

      return {
        id,
        username: user.username,
        email: user.email,
        password: user.password,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      elizaLogger.error("Error creating user:", error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const sql = this.isPostgres ? 
        `SELECT * FROM users WHERE email = $1` :
        `SELECT * FROM users WHERE email = ?`;
      
      const row = await this.queryRow(sql, [email]);
      
      if (!row) return null;
      
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      elizaLogger.error("Error getting user by email:", error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const sql = this.isPostgres ?
        `SELECT * FROM users WHERE username = $1` :
        `SELECT * FROM users WHERE username = ?`;
      
      const row = await this.queryRow(sql, [username]);
      
      if (!row) return null;
      
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      elizaLogger.error("Error getting user by username:", error);
      throw error;
    }
  }

  async getAccountByUsername(username: string): Promise<{ id: string; username: string } | null> {
    try {
      const sql = this.isPostgres ?
        `SELECT id, username FROM accounts WHERE username = $1` :
        `SELECT id, username FROM accounts WHERE username = ?`;
      
      const row = await this.queryRow(sql, [username]);
      
      if (!row) return null;
      
      return {
        id: row.id,
        username: row.username
      };
    } catch (error) {
      elizaLogger.error("Error getting account by username:", error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const sql = this.isPostgres ?
        `SELECT * FROM users WHERE id = $1` :
        `SELECT * FROM users WHERE id = ?`;
      
      const row = await this.queryRow(sql, [id]);
      
      if (!row) return null;
      
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      elizaLogger.error("Error getting user by ID:", error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      elizaLogger.info('Database: Getting all users from users table...');
      const sql = `SELECT * FROM users ORDER BY created_at DESC`;
      
      if (this.isPostgres) {
        // For PostgreSQL adapter
        let result;
        if (this.dbAdapter.query) {
          result = await this.dbAdapter.query(sql);
        } else if (this.dbAdapter.db && this.dbAdapter.db.query) {
          result = await this.dbAdapter.db.query(sql);
        } else {
          throw new Error("PostgreSQL query method not found");
        }
        
        elizaLogger.info(`Database: Found ${result.rows?.length || 0} users in PostgreSQL`);
        return (result.rows || []).map((row: any) => ({
          id: row.id,
          username: row.username,
          email: row.email,
          password: row.password,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        }));
      } else {
        // For SQLite adapter
        const db = this.dbAdapter.db || this.dbAdapter;
        let rows;
        if (db.prepare) {
          rows = db.prepare(sql).all();
        } else if (db.all) {
          rows = await db.all(sql);
        } else {
          throw new Error("SQLite query method not found");
        }
        
        elizaLogger.info(`Database: Found ${rows?.length || 0} users in SQLite`);
        return rows.map((row: any) => ({
          id: row.id,
          username: row.username,
          email: row.email,
          password: row.password,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        }));
      }
    } catch (error) {
      elizaLogger.error("Error getting all users:", error);
      // Check if it's a table doesn't exist error
      if (error.message && error.message.includes('no such table')) {
        elizaLogger.error("Users table does not exist. Please ensure the database is properly initialized.");
      }
      throw error;
    }
  }

  private generateUserId(): string {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }


async findUserByEmailCI(email: string): Promise<any | null> {
  const sql = this.isPostgres
    ? `SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`
    : `SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`;

  const row = await this.queryRow(sql, [email]);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

/** Insert a password reset token (store only the hash) */
async createPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<void> {
  if (this.isPostgres) {
    const sql = `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
                 VALUES ($1, $2, $3)`;
    await this.dbAdapter.query(sql, [userId, tokenHash, expiresAt]);
  } else {
    const sql = `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
                 VALUES (?, ?, ?)`;
    const db = this.dbAdapter.db || this.dbAdapter;
    if (db.prepare) db.prepare(sql).run(userId, tokenHash, expiresAt.toISOString());
    else await db.run(sql, [userId, tokenHash, expiresAt.toISOString()]);
  }
}

/** Fetch a valid (unconsumed, unexpired) token by its hash */
async findValidPasswordResetToken(tokenHash: string): Promise<any | null> {
  if (this.isPostgres) {
    const sql = `SELECT * FROM password_reset_tokens
                 WHERE token_hash=$1 AND consumed_at IS NULL AND expires_at > NOW()
                 LIMIT 1`;
    const result = await this.dbAdapter.query(sql, [tokenHash]);
    return result.rows?.[0] || null;
  } else {
    const sql = `SELECT * FROM password_reset_tokens
                 WHERE token_hash=? AND consumed_at IS NULL AND expires_at > CURRENT_TIMESTAMP
                 LIMIT 1`;
    const db = this.dbAdapter.db || this.dbAdapter;
    if (db.prepare) return db.prepare(sql).get(tokenHash) || null;
    if (db.get) return (await db.get(sql, [tokenHash])) || null;
    return null;
  }
}

/** Mark a token as consumed (single use) */
async markPasswordResetTokenConsumed(tokenHash: string): Promise<void> {
  if (this.isPostgres) {
    const sql = `UPDATE password_reset_tokens SET consumed_at = NOW() WHERE token_hash = $1`;
    await this.dbAdapter.query(sql, [tokenHash]);
  } else {
    const sql = `UPDATE password_reset_tokens SET consumed_at = CURRENT_TIMESTAMP WHERE token_hash = ?`;
    const db = this.dbAdapter.db || this.dbAdapter;
    if (db.prepare) db.prepare(sql).run(tokenHash);
    else await db.run(sql, [tokenHash]);
  }
}

/** Update the user's password; tries common column names */
async setUserPassword(userId: string, newHash: string): Promise<void> {
  const variants = this.isPostgres
    ? [
        [`UPDATE users SET password = $1 WHERE id = $2`, [newHash, userId]],
        [`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]],
        [`UPDATE users SET hashed_password = $1 WHERE id = $2`, [newHash, userId]],
      ]
    : [
        [`UPDATE users SET password = ? WHERE id = ?`, [newHash, userId]],
        [`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, userId]],
        [`UPDATE users SET hashed_password = ? WHERE id = ?`, [newHash, userId]],
      ];

  for (const [sql, params] of variants) {
    const res = this.isPostgres
      ? await this.dbAdapter.query(sql as string, params as any[])
      : await (() => {
          const db = this.dbAdapter.db || this.dbAdapter;
          if (db.prepare) return db.prepare(sql).run(...(params as any[]));
          if (db.run) return db.run(sql, params);
          return { changes: 0 };
        })();

    const affected = (res && (res.rowCount ?? res.changes ?? 0)) || 0;
    if (affected > 0) return;
  }
  throw new Error("No password column on users table could be updated.");
}

// === /ADD ONLY ======================================================
}