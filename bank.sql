CREATE TABLE users(
    id INTEGER PRIMARY KEY,
    username VARCHAR UNIQUE,
    password VARCHAR
);

CREATE TABLE accounts(
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    balance REAL
);

CREATE TABLE transactions(
    user_id INTEGER NOT NULL REFERENCES users(id),
    from_id INTEGER REFERENCES accounts(id),
    to_id INTEGER NOT NULL REFERENCES accounts(id),
    amount REAL,
    txn_time DATE DEFAULT (datetime('now')),
    memo VARCHAR
);

INSERT INTO users(id, username, password) -- 'cpsc455'
VALUES(1, 'ProfAvery', '$2b$14$dMN1VmYiqrXNS5ReO6y/PeSFZaHGXXP5yxGYq0GTIKwapq3/889/m');

INSERT INTO users(id, username, password) -- 'blackhat'
VALUES(2,'student','$2b$14$5fvuouit6hyDJ652QpZRhuDKoRzjbWfLKfOolefa9bm2KrJg8oe/m');

BEGIN TRANSACTION;
INSERT INTO accounts(id, user_id, balance) VALUES(1, 1, 20);
INSERT INTO transactions(user_id, from_id, to_id, amount, memo) VALUES(1, NULL, 1, 20, 'Initial deposit');
COMMIT;

BEGIN TRANSACTION;
INSERT INTO accounts(id, user_id, balance) VALUES(2, 1, 100);
INSERT INTO transactions(user_id, from_id, to_id, amount, memo) VALUES(1, NULL, 2, 100, 'Payroll direct deposit');
COMMIT;

BEGIN TRANSACTION;
INSERT INTO accounts(id, user_id, balance) VALUES(3, 2, 5);
INSERT INTO transactions(user_id, from_id, to_id, amount, memo) VALUES(2, NULL, 3, 5, 'Initial deposit');
COMMIT;
