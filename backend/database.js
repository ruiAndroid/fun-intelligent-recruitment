const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs').promises;
const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'db_intelligent_recruitment';

const DATA_FILE = path.join(__dirname, 'data', 'recruitment.json');
const INTERVIEW_FILE = path.join(__dirname, 'data', 'interviews.json');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4'
    });
  }
  return pool;
}

function escapeIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    charset: 'utf8mb4'
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${escapeIdentifier(DB_NAME)} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

function toNumber(value, defaultValue = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
}

function toBoolInt(value) {
  return value ? 1 : 0;
}

function normalizeRecruitmentRecord(item) {
  return [
    toNumber(item.id, Date.now()),
    item.type || 'social',
    item.position || '',
    item.experience ?? null,
    item.education ?? null,
    item.salary ?? null,
    item.recruitmentType ?? null,
    item.location ?? null,
    item.department ?? null,
    toNumber(item.count, 0),
    item.recruiter ?? null,
    item.remarks ?? null,
    item.priority || 'medium',
    item.status || 'recruiting',
    item.description ?? null,
    toNumber(item.resumeCount, 0),
    toNumber(item.interviewedCount, 0),
    item.createdAt || new Date().toISOString(),
    item.updatedAt || null
  ];
}

function normalizeInterviewRecord(item) {
  const normalizedPositionId =
    item.positionId === '' || item.positionId == null
      ? null
      : toNumber(item.positionId, null);

  return [
    toNumber(item.id, Date.now()),
    normalizedPositionId,
    item.position || '',
    item.candidateName || '',
    item.phone ?? null,
    item.interviewTime ?? null,
    item.interviewer ?? null,
    item.interviewType ?? null,
    item.type || 'social',
    item.department ?? null,
    toBoolInt(item.isKeyFocus),
    toBoolInt(item.isCompleted),
    item.school ?? null,
    item.major ?? null,
    item.remarks ?? null,
    item.feedback ?? null,
    toBoolInt(item.feedbackSubmitted),
    item.feedbackSubmittedAt ?? null,
    item.shareId ?? null,
    item.shareLink ?? null,
    item.createdAt || new Date().toISOString()
  ];
}

function mapRecruitmentRow(row) {
  return {
    id: toNumber(row.id, 0),
    type: row.type || 'social',
    position: row.position || '',
    experience: row.experience || '',
    education: row.education || '',
    salary: row.salary || '',
    recruitmentType: row.recruitmentType || '',
    location: row.location || '',
    department: row.department || '',
    count: toNumber(row.count, 0),
    recruiter: row.recruiter || '',
    remarks: row.remarks || '',
    priority: row.priority || 'medium',
    status: row.status || 'recruiting',
    description: row.description || '',
    resumeCount: toNumber(row.resumeCount, 0),
    interviewedCount: toNumber(row.interviewedCount, 0),
    createdAt: row.createdAt || '',
    updatedAt: row.updatedAt || ''
  };
}

function mapInterviewRow(row) {
  return {
    id: toNumber(row.id, 0),
    positionId: row.positionId == null ? null : toNumber(row.positionId, 0),
    position: row.position || '',
    candidateName: row.candidateName || '',
    phone: row.phone || '',
    interviewTime: row.interviewTime || '',
    interviewer: row.interviewer || '',
    interviewType: row.interviewType || '',
    type: row.type || 'social',
    department: row.department || '',
    isKeyFocus: Boolean(row.isKeyFocus),
    isCompleted: Boolean(row.isCompleted),
    school: row.school || '',
    major: row.major || '',
    remarks: row.remarks || '',
    feedback: row.feedback || '',
    feedbackSubmitted: Boolean(row.feedbackSubmitted),
    feedbackSubmittedAt: row.feedbackSubmittedAt || '',
    shareId: row.shareId || '',
    shareLink: row.shareLink || '',
    createdAt: row.createdAt || ''
  };
}

async function initDatabase() {
  await ensureDatabaseExists();
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS recruitment (
      id BIGINT PRIMARY KEY,
      type VARCHAR(50) NOT NULL DEFAULT 'social',
      position VARCHAR(255) NOT NULL DEFAULT '',
      experience VARCHAR(255) NULL,
      education VARCHAR(255) NULL,
      salary VARCHAR(255) NULL,
      recruitment_type VARCHAR(50) NULL,
      location VARCHAR(255) NULL,
      department VARCHAR(255) NULL,
      count INT NOT NULL DEFAULT 0,
      recruiter VARCHAR(255) NULL,
      remarks TEXT NULL,
      priority VARCHAR(50) NOT NULL DEFAULT 'medium',
      status VARCHAR(50) NOT NULL DEFAULT 'recruiting',
      description LONGTEXT NULL,
      resume_count INT NOT NULL DEFAULT 0,
      interviewed_count INT NOT NULL DEFAULT 0,
      created_at VARCHAR(50) NOT NULL,
      updated_at VARCHAR(50) NULL,
      INDEX idx_recruitment_status (status),
      INDEX idx_recruitment_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS interviews (
      id BIGINT PRIMARY KEY,
      position_id BIGINT NULL,
      position VARCHAR(255) NOT NULL DEFAULT '',
      candidate_name VARCHAR(255) NOT NULL DEFAULT '',
      phone VARCHAR(100) NULL,
      interview_time VARCHAR(50) NULL,
      interviewer VARCHAR(255) NULL,
      interview_type VARCHAR(50) NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'social',
      department VARCHAR(255) NULL,
      is_key_focus TINYINT(1) NOT NULL DEFAULT 0,
      is_completed TINYINT(1) NOT NULL DEFAULT 0,
      school VARCHAR(255) NULL,
      major VARCHAR(255) NULL,
      remarks TEXT NULL,
      feedback LONGTEXT NULL,
      feedback_submitted TINYINT(1) NOT NULL DEFAULT 0,
      feedback_submitted_at VARCHAR(50) NULL,
      share_id VARCHAR(100) NULL,
      share_link TEXT NULL,
      created_at VARCHAR(50) NOT NULL,
      INDEX idx_interviews_type (type),
      INDEX idx_interviews_position_id (position_id),
      INDEX idx_interviews_share_id (share_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function readData() {
  const db = getPool();
  const [rows] = await db.query(`
    SELECT
      id,
      type,
      position,
      experience,
      education,
      salary,
      recruitment_type AS recruitmentType,
      location,
      department,
      count,
      recruiter,
      remarks,
      priority,
      status,
      description,
      resume_count AS resumeCount,
      interviewed_count AS interviewedCount,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM recruitment
    ORDER BY id ASC
  `);
  return rows.map(mapRecruitmentRow);
}

async function writeData(data) {
  const db = getPool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM recruitment');

    for (const item of data) {
      await connection.query(
        `
        INSERT INTO recruitment (
          id,
          type,
          position,
          experience,
          education,
          salary,
          recruitment_type,
          location,
          department,
          count,
          recruiter,
          remarks,
          priority,
          status,
          description,
          resume_count,
          interviewed_count,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        normalizeRecruitmentRecord(item)
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function readInterviews() {
  const db = getPool();
  const [rows] = await db.query(`
    SELECT
      id,
      position_id AS positionId,
      position,
      candidate_name AS candidateName,
      phone,
      interview_time AS interviewTime,
      interviewer,
      interview_type AS interviewType,
      type,
      department,
      is_key_focus AS isKeyFocus,
      is_completed AS isCompleted,
      school,
      major,
      remarks,
      feedback,
      feedback_submitted AS feedbackSubmitted,
      feedback_submitted_at AS feedbackSubmittedAt,
      share_id AS shareId,
      share_link AS shareLink,
      created_at AS createdAt
    FROM interviews
    ORDER BY id ASC
  `);
  return rows.map(mapInterviewRow);
}

async function writeInterviews(data) {
  const db = getPool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM interviews');

    for (const item of data) {
      await connection.query(
        `
        INSERT INTO interviews (
          id,
          position_id,
          position,
          candidate_name,
          phone,
          interview_time,
          interviewer,
          interview_type,
          type,
          department,
          is_key_focus,
          is_completed,
          school,
          major,
          remarks,
          feedback,
          feedback_submitted,
          feedback_submitted_at,
          share_id,
          share_link,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        normalizeInterviewRecord(item)
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function readJsonArray(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

async function migrateLegacyData() {
  const db = getPool();

  const [recruitmentCountRows] = await db.query('SELECT COUNT(*) AS total FROM recruitment');
  const recruitmentCount = toNumber(recruitmentCountRows[0]?.total, 0);
  if (recruitmentCount === 0) {
    const recruitmentData = await readJsonArray(DATA_FILE);
    if (recruitmentData.length > 0) {
      await writeData(recruitmentData);
      console.log(`已迁移 recruitment 数据 ${recruitmentData.length} 条到 MySQL`);
    }
  }

  const [interviewCountRows] = await db.query('SELECT COUNT(*) AS total FROM interviews');
  const interviewCount = toNumber(interviewCountRows[0]?.total, 0);
  if (interviewCount === 0) {
    const interviewData = await readJsonArray(INTERVIEW_FILE);
    if (interviewData.length > 0) {
      await writeInterviews(interviewData);
      console.log(`已迁移 interviews 数据 ${interviewData.length} 条到 MySQL`);
    }
  }
}

module.exports = {
  initDatabase,
  migrateLegacyData,
  readData,
  writeData,
  readInterviews,
  writeInterviews
};
