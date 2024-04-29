'use strict'

const assert = require('assert')
const path = require('path')

const Address = require('address-rfc2821').Address
const fixtures = require('haraka-test-fixtures')

const _set_up = function (done) {
  this.plugin = new fixtures.plugin('aliases')
  this.params = [new Address('<test1@example.com>')]

  this.connection = new fixtures.connection.createConnection()
  this.connection.init_transaction()
  this.connection.transaction.rcpt_to = [this.params]
  this.connection.loginfo = fixtures.stub.stub()

  // some test data
  this.plugin.config = this.plugin.config.module_config(path.resolve('test'))
  this.plugin.inherits = fixtures.stub.stub()

  // going to need these in multiple tests
  this.plugin.register()

  done()
}

describe('aliases', function () {
  beforeEach(_set_up)

  it('should have register function', function () {
    assert.ok(this.plugin)
    assert.equal('function', typeof this.plugin.register)
  })

  it('register function should inherit from queue/discard', function () {
    assert.ok(this.plugin.inherits.called)
    assert.equal(this.plugin.inherits.args[0], 'queue/discard')
  })

  it('register function should call register_hook()', function () {
    assert.ok(this.plugin.register_hook.called)
  })

  it('register_hook() should register for proper hook', function () {
    assert.equal(this.plugin.register_hook.args[0], 'rcpt')
  })

  it('register_hook() should register available function', function () {
    assert.equal(this.plugin.register_hook.args[1], 'aliases')
    assert.ok(this.plugin.aliases)
    assert.equal(typeof this.plugin.aliases, 'function')
  })

  it('aliases hook always returns next()', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.equal(action, undefined)
        done()
      },
      this.connection,
      this.params,
    )
  })

  it('should drop test1@example.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.notes.discard)
        done()
      },
      this.connection,
      this.params,
    )
  })

  it('should drop test2-testing@example.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.notes.discard)
        done()
      },
      this.connection,
      [new Address('<test2-testing@example.com>')],
    )
  })

  it('should drop test2-specific@example.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.equal(this.connection.transaction.notes.discard, undefined)
        assert.ok(this.connection.transaction.rcpt_to)
        assert.ok(Array.isArray(this.connection.transaction.rcpt_to))
        assert.deepEqual(
          this.connection.transaction.rcpt_to.pop(),
          new Address('<test2@example.com>'),
        )
        done()
      },
      this.connection,
      [new Address('<test2-specific@example.com>')],
    )
  })

  it('should map test3@example.com to test3-works@example.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.rcpt_to)
        assert.ok(Array.isArray(this.connection.transaction.rcpt_to))
        assert.deepEqual(
          this.connection.transaction.rcpt_to.pop(),
          new Address('<test3-works@example.com>'),
        )
        done()
      },
      this.connection,
      [new Address('<test3@example.com>')],
    )
  })

  it('should map test4-testing@example.com to test4@example.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.rcpt_to)
        assert.ok(Array.isArray(this.connection.transaction.rcpt_to))
        assert.deepEqual(
          this.connection.transaction.rcpt_to.pop(),
          new Address('<test4@example.com>'),
        )
        done()
      },
      this.connection,
      [new Address('<test4-testing@example.com>')],
    )
  })

  it('should map test4+testing@example.com to test4@example.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.rcpt_to)
        assert.ok(Array.isArray(this.connection.transaction.rcpt_to))
        assert.deepEqual(
          this.connection.transaction.rcpt_to.pop(),
          new Address('<test4@example.com>'),
        )
        done()
      },
      this.connection,
      [new Address('<test4+testing@example.com>')],
    )
  })

  it('should map test5@example.com to test5-works@success.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.rcpt_to)
        assert.ok(Array.isArray(this.connection.transaction.rcpt_to))
        assert.deepEqual(
          this.connection.transaction.rcpt_to.pop(),
          new Address('<test5-works@success.com>'),
        )
        done()
      },
      this.connection,
      [new Address('<test5@example.com>')],
    )
  })

  it('should map test6-testing@example.com to test6-works@success.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.rcpt_to)
        assert.ok(Array.isArray(this.connection.transaction.rcpt_to))
        assert.deepEqual(
          this.connection.transaction.rcpt_to.pop(),
          new Address('<test6-works@success.com>'),
        )
        done()
      },
      this.connection,
      [new Address('<test6-testing@example.com>')],
    )
  })

  it('should drop @example.co', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.notes.discard)
        done()
      },
      this.connection,
      [new Address('<oc.elpmaxe@example.co>')],
    )
  })

  it('should drop test11@example.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.notes.discard)
        done()
      },
      this.connection,
      [new Address('<test11@example.org>')],
    )
  })

  it('should map @demo.com to test12-works@success.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.rcpt_to)
        assert.ok(Array.isArray(this.connection.transaction.rcpt_to))
        assert.deepEqual(
          this.connection.transaction.rcpt_to.pop(),
          new Address('<test12-works@success.com>'),
        )
        done()
      },
      this.connection,
      [new Address('<demo2014@demo.com>')],
    )
  })

  it('should map test13@example.net to test13-works@success.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.rcpt_to)
        assert.ok(Array.isArray(this.connection.transaction.rcpt_to))
        assert.deepEqual(
          this.connection.transaction.rcpt_to.pop(),
          new Address('<test13-works@success.com>'),
        )
        done()
      },
      this.connection,
      [new Address('<test13@example.net>')],
    )
  })

  it('should map test13+subaddress@example.net to test13-works@success.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.rcpt_to)
        assert.ok(Array.isArray(this.connection.transaction.rcpt_to))
        assert.deepEqual(
          this.connection.transaction.rcpt_to.pop(),
          new Address('<test13-works@success.com>'),
        )
        done()
      },
      this.connection,
      [new Address('<test13+subaddress@example.net>')],
    )
  })

  it('should explode test14@example.net to alice@success.com and bob@success.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.rcpt_to)
        assert.ok(Array.isArray(this.connection.transaction.rcpt_to))
        assert.deepEqual(this.connection.transaction.rcpt_to, [
          new Address('<alice@success.com>'),
          new Address('<bob@success.com>'),
        ])
        done()
      },
      this.connection,
      [new Address('<test14@example.net>')],
    )
  })

  it('should not drop test1@example.com, no config', function (done) {
    this.plugin.cfg = {} // empty config data
    this.plugin.aliases(
      (action) => {
        assert.equal(undefined, this.connection.transaction.notes.discard)
        done()
      },
      this.connection,
      this.params,
    )
  })

  it('should fail with loginfo on unknown action', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.loginfo.called)
        assert.equal(
          this.connection.loginfo.args[1],
          `unknown action: ${this.plugin.cfg.test7.action}`,
        )
        done()
      },
      this.connection,
      [new Address('<test7@example.com>')],
    )
  })

  it('should fail with loginfo on missing action', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.loginfo.called)
        assert.equal(
          this.connection.loginfo.args[1],
          'unknown action: <missing>',
        )
        done()
      },
      this.connection,
      [new Address('<test8@example.com>')],
    )
  })

  it('should map * to test15-works@success.com', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.transaction.rcpt_to)
        assert.ok(Array.isArray(this.connection.transaction.rcpt_to))
        assert.deepEqual(
          this.connection.transaction.rcpt_to.pop(),
          new Address('<test15-works@success.com>'),
        )
        done()
      },
      this.connection,
      [new Address('test15@example.com')],
    )
  })

  it('action alias should fail with loginfo on missing to', function (done) {
    this.plugin.aliases(
      (action) => {
        assert.ok(this.connection.loginfo.called)
        assert.equal(
          this.connection.loginfo.args[1],
          'alias failed for test9, no "to" field in alias config',
        )
        done()
      },
      this.connection,
      [new Address('<test9@example.com>')],
    )
  })

  it('should prefer more specific rule', function (done) {
    this.plugin.cfg = {
      '@example.com': {
        action: 'alias',
        to: 'bar@example.com',
      },
      foo: {
        action: 'alias',
        to: 'foo@example.com',
      },
    }

    this.plugin.aliases(
      (action) => {
        assert.deepEqual(
          this.connection.transaction.rcpt_to.pop(),
          new Address('<foo@example.com>'),
        )
        done()
      },
      this.connection,
      [new Address('<foo-test@example.com>')],
    )
  })
})
