const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://dev:dev@localhost:5432/dev',
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      order_id TEXT PRIMARY KEY,
      order_date DATE NOT NULL,
      region TEXT NOT NULL,
      salesperson TEXT NOT NULL,
      product TEXT NOT NULL,
      category TEXT NOT NULL,
      units INTEGER NOT NULL,
      unit_price_nok NUMERIC NOT NULL,
      total_nok NUMERIC NOT NULL,
      channel TEXT NOT NULL,
      customer_segment TEXT NOT NULL
    )
  `);
  await loadSalesCsvIfEmpty();
}

async function loadSalesCsvIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*) FROM sales');
  if (Number(rows[0].count) > 0) return;

  const csvPath = path.join(__dirname, 'sales-data-q3.csv');
  if (!fs.existsSync(csvPath)) return;

  const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  const header = lines[0].split(',');
  const records = lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row = {};
    header.forEach((key, i) => (row[key] = cols[i]));
    return row;
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const row of records) {
      await client.query(
        `INSERT INTO sales (order_id, order_date, region, salesperson, product, category, units, unit_price_nok, total_nok, channel, customer_segment)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (order_id) DO NOTHING`,
        [
          row.order_id,
          row.date,
          row.region,
          row.salesperson,
          row.product,
          row.category,
          Number(row.units),
          Number(row.unit_price_nok),
          Number(row.total_nok),
          row.channel,
          row.customer_segment,
        ]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

app.get('/api/tasks', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, title, done, due_date FROM tasks ORDER BY done ASC, due_date ASC NULLS LAST, created_at ASC'
  );
  res.json(rows);
});

app.post('/api/tasks', async (req, res) => {
  const title = (req.body.title || '').trim();
  const dueDate = req.body.due_date || null;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const { rows } = await pool.query(
    'INSERT INTO tasks (title, due_date) VALUES ($1, $2) RETURNING id, title, done, due_date',
    [title, dueDate]
  );
  res.status(201).json(rows[0]);
});

app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { rows: existingRows } = await pool.query('SELECT id, title, done, due_date FROM tasks WHERE id = $1', [id]);
  if (!existingRows.length) return res.status(404).json({ error: 'Not found' });
  const current = existingRows[0];
  const done = req.body.done !== undefined ? req.body.done : current.done;
  const dueDate = req.body.due_date !== undefined ? req.body.due_date : current.due_date;
  const { rows } = await pool.query(
    'UPDATE tasks SET done = $1, due_date = $2 WHERE id = $3 RETURNING id, title, done, due_date',
    [done, dueDate, id]
  );
  res.json(rows[0]);
});

app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  res.status(204).end();
});

app.get('/api/sales-by-region', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT region, SUM(total_nok) AS total_nok, COUNT(*) AS orders
    FROM sales
    GROUP BY region
    ORDER BY total_nok DESC
  `);
  res.json(
    rows.map((r) => ({
      region: r.region,
      total_nok: Number(r.total_nok),
      orders: Number(r.orders),
    }))
  );
});

const PORT = process.env.PORT || 3000;
init()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Listening on 0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
