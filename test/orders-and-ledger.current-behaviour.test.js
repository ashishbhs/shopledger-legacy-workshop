var test = require('node:test');
var assert = require('node:assert/strict');
var orders = require('../lib/orders');
var ledger = require('../lib/ledger');

function order(id, date) {
  return {
    id: id,
    date: date,
    customer: 'Walk-in',
    status: 'completed',
    coupon: ''
  };
}

function customerDb() {
  return {
    customers: [{
      id: 7,
      name: 'Mina Stores',
      openingBalance: 0,
      totalBilled: 200,
      totalSettled: 100,
      balance: 100
    }],
    settlements: [],
    nextSettlementId: 501
  };
}

test('order history sorts DD/MM/YYYY dates in reverse chronological order', function () {
  var db = {
    orders: [
      order(1, '31/03/2022'),
      order(2, '02/04/2022'),
      order(3, '15/01/2022')
    ]
  };

  assert.deepEqual(orders.list(db, {}).map(function (entry) {
    return entry.id;
  }), [2, 1, 3]);
});

test('a from date includes orders on and after it across month boundaries', function () {
  var db = {
    orders: [
      order(1, '31/03/2022'),
      order(2, '02/04/2022')
    ]
  };

  assert.deepEqual(orders.list(db, { from: '2022-03-30' }).map(function (entry) {
    return entry.id;
  }), [2, 1]);
});

test('a to date excludes orders after it across month boundaries', function () {
  var db = {
    orders: [
      order(1, '31/03/2022'),
      order(2, '02/04/2022')
    ]
  };

  assert.deepEqual(orders.list(db, { to: '2022-03-31' }).map(function (entry) {
    return entry.id;
  }), [1]);
});

test('a string settlement amount is recorded as a numeric customer payment', function () {
  var db = customerDb();
  var result = ledger.recordSettlement(db, 7, '50', 'upi', 'April payment');

  assert.equal(result.ok, true);
  assert.equal(result.settlement.amount, 50);
  assert.equal(result.customer.totalSettled, 150);
  assert.equal(result.customer.balance, 50);
  assert.equal(db.settlements.length, 1);
});

test('a non-numeric settlement string is rejected without changing the customer balance', function () {
  var db = customerDb();
  var result = ledger.recordSettlement(db, 7, 'not-a-number');

  assert.equal(result.ok, false);
  assert.equal(result.error, 'Settlement amount must be greater than zero');
  assert.equal(db.customers[0].totalSettled, 100);
  assert.equal(db.customers[0].balance, 100);
  assert.equal(db.settlements.length, 0);
});
