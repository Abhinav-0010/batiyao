// Initial migration to create all tables
export async function up(queryRunner: any) {
  // Users table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      pseudonym VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'idle',
      tier VARCHAR(20) NOT NULL DEFAULT 'free',
      reputation INTEGER NOT NULL DEFAULT 0,
      total_chats INTEGER NOT NULL DEFAULT 0,
      report_count INTEGER NOT NULL DEFAULT 0,
      is_banned BOOLEAN NOT NULL DEFAULT false,
      ban_reason TEXT,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      banned_until TIMESTAMP
    );
  `);

  // Chat sessions table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY,
      initiator_id UUID NOT NULL,
      recipient_id UUID NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      mode VARCHAR(50) NOT NULL DEFAULT 'random',
      duration INTEGER NOT NULL DEFAULT 0,
      violation_count INTEGER NOT NULL DEFAULT 0,
      is_flagged BOOLEAN NOT NULL DEFAULT false,
      moderation_data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ended_at TIMESTAMP
    );
  `);

  // Moderation logs table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS moderation_logs (
      id UUID PRIMARY KEY,
      session_id UUID NOT NULL,
      type VARCHAR(50) NOT NULL,
      confidence FLOAT NOT NULL,
      description TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
    );
  `);

  // Payments table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      amount INTEGER NOT NULL,
      currency VARCHAR(10) NOT NULL,
      feature VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      stripe_transaction_id VARCHAR(255) NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Reports table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY,
      session_id UUID NOT NULL,
      reporter_id UUID NOT NULL,
      reported_user_id UUID NOT NULL,
      reason VARCHAR(50) NOT NULL,
      description TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'open',
      resolution TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id),
      FOREIGN KEY (reporter_id) REFERENCES users(id),
      FOREIGN KEY (reported_user_id) REFERENCES users(id)
    );
  `);

  // Create indices
  await queryRunner.query(`CREATE INDEX idx_users_pseudonym ON users(pseudonym);`);
  await queryRunner.query(`CREATE INDEX idx_users_status ON users(status);`);
  await queryRunner.query(`CREATE INDEX idx_users_tier ON users(tier);`);
  await queryRunner.query(`CREATE INDEX idx_chat_sessions_initiator ON chat_sessions(initiator_id, created_at);`);
  await queryRunner.query(`CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);`);
  await queryRunner.query(`CREATE INDEX idx_moderation_logs_session ON moderation_logs(session_id);`);
  await queryRunner.query(`CREATE INDEX idx_moderation_logs_created ON moderation_logs(created_at);`);
  await queryRunner.query(`CREATE INDEX idx_payments_user ON payments(user_id);`);
  await queryRunner.query(`CREATE INDEX idx_payments_status ON payments(status);`);
  await queryRunner.query(`CREATE INDEX idx_reports_reporter ON reports(reporter_id, created_at);`);
}

export async function down(queryRunner: any) {
  await queryRunner.query(`DROP TABLE IF EXISTS reports;`);
  await queryRunner.query(`DROP TABLE IF EXISTS payments;`);
  await queryRunner.query(`DROP TABLE IF EXISTS moderation_logs;`);
  await queryRunner.query(`DROP TABLE IF EXISTS chat_sessions;`);
  await queryRunner.query(`DROP TABLE IF EXISTS users;`);
}
