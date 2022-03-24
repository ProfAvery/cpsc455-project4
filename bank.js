const fs = require('fs')
const os = require('os')

const cookieSession = require('cookie-session')
const express = require('express')
const bcrypt = require('bcrypt')

const Database = require('better-sqlite3')

const PORT = 8080
const DB_FILE = './bank.db'
const DB_SQL = './bank.sql'

const app = express()

app.set('view engine', 'ejs')
app.set('view options', { outputFunctionName: 'echo' })

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieSession({
  secret: 'cpsc455-csrf',
  maxAge: 20 * 60 * 1000 // 20 minutes
}))

const db = new Database(DB_FILE, { verbose: console.log })
db.pragma('foreign_keys = ON')

app.get('/', (req, res) => {
  res.redirect('/login')
})

app.get('/login', (req, res) => {
  res.render('login', { current: 'login', msg: null })
})

app.post('/login', (req, res) => {
  const username = req.body.username

  const stmt = db.prepare(`
      SELECT id, username, password
      FROM users
      WHERE username = ?
    `)

  const user = stmt.get(username)
  if (!user) {
    res.render('login', { current: 'login', msg: 'an incorrect username or password was entered' })
    return
  }

  bcrypt.compare(req.body.password, user.password, (err, result) => {
    if (err) {
      throw err
    }

    if (result) {
      req.session.user_id = user.id
      res.redirect('/balance')
    } else {
      res.render('login', { current: 'login', msg: 'an incorrect username or password was entered' })
    }
  })
})

function validateSession (req, res) {
  const userId = req.session.user_id

  if (!userId) {
    res.render('login', { current: 'login', msg: 'invalid session' })
    return { userId: null, username: null }
  }

  const stmt = db.prepare('SELECT username FROM users WHERE id = ?')
  const user = stmt.get(userId)

  return { userId: userId, username: user.username }
}

app.get('/balance', (req, res) => {
  const { userId, username } = validateSession(req, res)
  if (!userId) { return }

  const stmt = db.prepare('SELECT id, balance FROM accounts WHERE user_id = ?')
  const accounts = stmt.all(userId)

  res.render('balance', { current: 'balance', username, accounts })
})

app.get('/deposit', (req, res) => {
  const { userId, username } = validateSession(req, res)
  if (!userId) { return }

  const stmt = db.prepare('SELECT id, balance FROM accounts WHERE user_id = ?')
  const accounts = stmt.all(userId)

  res.render('deposit', { current: 'deposit', username, accounts })
})

app.post('/deposit', (req, res) => {
  const { userId, username } = validateSession(req, res)
  if (!userId) { return }

  const stmt = db.prepare(`
      UPDATE accounts
      SET balance = balance + ?
      WHERE id = ?
    `)

  for (const deposit of req.body.deposits) {
    stmt.run(deposit.amount, deposit.id)
  }

  res.redirect('/balance', { current: 'balance', username })
})

app.post('/logout', (req, res) => {
  req.session = null
  res.render('login', { current: 'login', msg: 'logged out' })
})

app.get('/transfer/:from/:to/:amount', (req, res) => {
  const stmt = db.prepare(`
    SELECT 1
    FROM accounts
    WHERE id = ?
      AND user_id = ?
  `)

  const valid = stmt.get(req.params.from, req.session.user_id)
  if (!valid) {
    res.status(401)
    res.json({ msg: 'invalid transfer' })
    return
  }

  const deposit = db.prepare(`
      UPDATE accounts
      SET balance = balance + ?
      WHERE id = ?
    `)

  const withdrawal = db.prepare(`
      UPDATE accounts
      SET balance = balance - ?
      WHERE id = ?
    `)

  const transfer = db.transaction((from, to, amount) => {
    withdrawal.run(amount, from)
    deposit.run(amount, to)
    res.json({ from, to, amount })
  })

  transfer(req.params.from, req.params.to, req.params.amount)
})

app.listen(PORT, () => {
  const stmt = db.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table'
      AND name = 'users'
  `)
  const exists = stmt.get()

  if (!exists) {
    const setup = fs.readFileSync(DB_SQL, { encoding: 'utf-8' })
    db.exec(setup)
  }

  console.log(`Server running at http://${os.hostname()}:${PORT}/`)
})
