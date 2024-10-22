const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const cors = require('cors');

const port = 3000;

const dbPath = path.join(__dirname, 'data.db');

const app = express();
app.use(express.json());
app.use(cors());

let db = null;

const initializingServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    
    app.listen(port, () => {
      console.log(`Server started at port ${port}`);
    });
  } catch (e) {
    console.log(`Error: ${e.message}`);
    process.exit(1);
  }
};

initializingServer();

app.post('/transactions', async (req, res) => {
  const { type, category, amount, date, description } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO transactions (type, category, amount, date, description) VALUES (?, ?, ?, ?, ?)',
      [type, category, amount, date, description]
    );
    return res.json({ ok: true, message: 'Transaction added', id: result.lastID });
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return res.json({ ok: false, message: error.message });
  }
});

app.get('/transactions', async (req, res) => {
  try {
    const transactions = await db.all('SELECT * FROM transactions');
    return res.json(transactions);
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return res.json({ ok: false, message: error.message });
  }
});

app.get('/transactions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
    if (transaction) {
      return res.json(transaction);
    } else {
      return res.status(404).json({ message: 'Transaction not found' });
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return res.json({ ok: false, message: error.message });
  }
});

app.put('/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const { type, category, amount, date, description } = req.body;
  try {
    const result = await db.run(
      'UPDATE transactions SET type = ?, category = ?, amount = ?, date = ?, description = ? WHERE id = ?',
      [type, category, amount, date, description, id]
    );
    if (result.changes > 0) {
      return res.json({ ok: true, message: 'Transaction updated', id });
    } else {
      return res.status(404).json({ message: 'Transaction not found' });
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return res.json({ ok: false, message: error.message });
  }
});

app.delete('/transactions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.run('DELETE FROM transactions WHERE id = ?', [id]);
    if (result.changes > 0) {
      return res.json({ ok: true, message: 'Transaction deleted', id });
    } else {
      return res.status(404).json({ message: 'Transaction not found' });
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return res.json({ ok: false, message: error.message });
  }
});

app.post('/categories', async (req, res) => {
  const { name, type } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO categories (name, type) VALUES (?, ?)',
      [name, type]
    );
    return res.json({ ok: true, message: 'Category added', id: result.lastID });
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return res.json({ ok: false, message: error.message });
  }
});

app.get('/categories', async (req, res) => {
  try {
    const categories = await db.all('SELECT * FROM categories');
    return res.json(categories);
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return res.json({ ok: false, message: error.message });
  }
});

app.delete('/categories/:name', async (req, res) => {
  const { name } = req.params;
  try {
    await db.run('DELETE FROM transactions WHERE category = ?', [name]);

    const result = await db.run('DELETE FROM categories WHERE name = ?', [name]);
    if (result.changes > 0) {
      return res.json({ ok: true, message: 'Category deleted', name });
    } else {
      return res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return res.json({ ok: false, message: error.message });
  }
});

app.get('/summary', async (req, res) => {
  try {
    const summary = await db.get(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpenses
      FROM transactions
    `);
    const balance = summary.totalIncome - summary.totalExpenses;
    return res.json({ totalIncome: summary.totalIncome, totalExpenses: summary.totalExpenses, balance });
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return res.json({ ok: false, message: error.message });
  }
});
