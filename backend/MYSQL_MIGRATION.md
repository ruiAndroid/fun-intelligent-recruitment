# MySQL Migration Guide

## 1. Prepare `.env`

Copy `.env.example` to `.env` and fill your local MySQL credentials:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=db_intelligent_recruitment
```

## 2. Start backend

```bash
npm install
npm run dev
```

On startup, backend will:

1. Create database `db_intelligent_recruitment` if not exists.
2. Create tables `recruitment` and `interviews` if not exists.
3. If the target table is empty, import legacy data from:
   - `backend/data/recruitment.json`
   - `backend/data/interviews.json`

## 3. Notes

- Migration import is idempotent for empty tables only.
- If you already have data in MySQL tables, legacy JSON import will be skipped.

