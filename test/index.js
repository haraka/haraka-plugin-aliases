'use strict'

const assert = require('node:assert')
const path = require('node:path')
const { describe, it, beforeEach } = require('node:test')

const { Address } = require('@haraka/email-address')
const fixtures = require('haraka-test-fixtures')

let plugin, params, connection

const _set_up = () => {
  plugin = new fixtures.plugin('aliases')
  params = [new Address('<test1@example.com>')]

  connection = new fixtures.connection.createConnection()
  connection.init_transaction()
  connection.transaction.rcpt_to = [params]
  connection.loginfo = fixtures.stub.stub()

  // some test data
  plugin.config = plugin.config.module_config(path.resolve('test'))
  plugin.inherits = fixtures.stub.stub()

  // going to need these in multiple tests
  plugin.register()
}

describe('aliases', () => {
  beforeEach(_set_up)

  it('should have register function', () => {
    assert.ok(plugin)
    assert.equal('function', typeof plugin.register)
  })

  it('register function should inherit from queue/discard', () => {
    assert.ok(plugin.inherits.called)
    assert.equal(plugin.inherits.args[0], 'queue/discard')
  })

  it('register function registers a hook', () => {
    assert.ok(Object.keys(plugin.hooks).length > 0)
  })

  it('registers on the rcpt hook', () => {
    assert.ok(plugin.hooks.rcpt)
  })

  it('registers the aliases handler on rcpt', () => {
    assert.ok(plugin.hooks.rcpt.includes('aliases'))
    assert.ok(plugin.aliases)
    assert.equal(typeof plugin.aliases, 'function')
  })

  it('aliases hook always returns next()', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.equal(action, undefined)
          resolve()
        },
        connection,
        params,
      )
    })
  })

  it('should drop test1@example.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.notes.discard)
          resolve()
        },
        connection,
        params,
      )
    })
  })

  it('should drop test2-testing@example.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.notes.discard)
          resolve()
        },
        connection,
        [new Address('<test2-testing@example.com>')],
      )
    })
  })

  it('should drop test2-specific@example.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.equal(connection.transaction.notes.discard, undefined)
          assert.ok(connection.transaction.rcpt_to)
          assert.ok(Array.isArray(connection.transaction.rcpt_to))
          assert.deepEqual(
            connection.transaction.rcpt_to.pop(),
            new Address('<test2@example.com>'),
          )
          resolve()
        },
        connection,
        [new Address('<test2-specific@example.com>')],
      )
    })
  })

  it('should map test3@example.com to test3-works@example.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.rcpt_to)
          assert.ok(Array.isArray(connection.transaction.rcpt_to))
          assert.deepEqual(
            connection.transaction.rcpt_to.pop(),
            new Address('<test3-works@example.com>'),
          )
          resolve()
        },
        connection,
        [new Address('<test3@example.com>')],
      )
    })
  })

  it('should map test4-testing@example.com to test4@example.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.rcpt_to)
          assert.ok(Array.isArray(connection.transaction.rcpt_to))
          assert.deepEqual(
            connection.transaction.rcpt_to.pop(),
            new Address('<test4@example.com>'),
          )
          resolve()
        },
        connection,
        [new Address('<test4-testing@example.com>')],
      )
    })
  })

  it('should map test4+testing@example.com to test4@example.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.rcpt_to)
          assert.ok(Array.isArray(connection.transaction.rcpt_to))
          assert.deepEqual(
            connection.transaction.rcpt_to.pop(),
            new Address('<test4@example.com>'),
          )
          resolve()
        },
        connection,
        [new Address('<test4+testing@example.com>')],
      )
    })
  })

  it('should map test5@example.com to test5-works@success.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.rcpt_to)
          assert.ok(Array.isArray(connection.transaction.rcpt_to))
          assert.deepEqual(
            connection.transaction.rcpt_to.pop(),
            new Address('<test5-works@success.com>'),
          )
          resolve()
        },
        connection,
        [new Address('<test5@example.com>')],
      )
    })
  })

  it('should map test6-testing@example.com to test6-works@success.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.rcpt_to)
          assert.ok(Array.isArray(connection.transaction.rcpt_to))
          assert.deepEqual(
            connection.transaction.rcpt_to.pop(),
            new Address('<test6-works@success.com>'),
          )
          resolve()
        },
        connection,
        [new Address('<test6-testing@example.com>')],
      )
    })
  })

  it('should drop @example.co', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.notes.discard)
          resolve()
        },
        connection,
        [new Address('<oc.elpmaxe@example.co>')],
      )
    })
  })

  it('should drop test11@example.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.notes.discard)
          resolve()
        },
        connection,
        [new Address('<test11@example.org>')],
      )
    })
  })

  it('should map @demo.com to test12-works@success.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.rcpt_to)
          assert.ok(Array.isArray(connection.transaction.rcpt_to))
          assert.deepEqual(
            connection.transaction.rcpt_to.pop(),
            new Address('<test12-works@success.com>'),
          )
          resolve()
        },
        connection,
        [new Address('<demo2014@demo.com>')],
      )
    })
  })

  it('should map test13@example.net to test13-works@success.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.rcpt_to)
          assert.ok(Array.isArray(connection.transaction.rcpt_to))
          assert.deepEqual(
            connection.transaction.rcpt_to.pop(),
            new Address('<test13-works@success.com>'),
          )
          resolve()
        },
        connection,
        [new Address('<test13@example.net>')],
      )
    })
  })

  it('should map test13+subaddress@example.net to test13-works@success.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.rcpt_to)
          assert.ok(Array.isArray(connection.transaction.rcpt_to))
          assert.deepEqual(
            connection.transaction.rcpt_to.pop(),
            new Address('<test13-works@success.com>'),
          )
          resolve()
        },
        connection,
        [new Address('<test13+subaddress@example.net>')],
      )
    })
  })

  it('should explode test14@example.net to alice@success.com and bob@success.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.rcpt_to)
          assert.ok(Array.isArray(connection.transaction.rcpt_to))
          assert.deepEqual(connection.transaction.rcpt_to, [
            new Address('<alice@success.com>'),
            new Address('<bob@success.com>'),
          ])
          resolve()
        },
        connection,
        [new Address('<test14@example.net>')],
      )
    })
  })

  it('should not drop test1@example.com, no config', async () => {
    plugin.cfg = {} // empty config data
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.equal(undefined, connection.transaction.notes.discard)
          resolve()
        },
        connection,
        params,
      )
    })
  })

  it('should fail with loginfo on unknown action', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.loginfo.called)
          assert.equal(
            connection.loginfo.args[1],
            `unknown action: ${plugin.cfg.test7.action}`,
          )
          resolve()
        },
        connection,
        [new Address('<test7@example.com>')],
      )
    })
  })

  it('should fail with loginfo on missing action', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.loginfo.called)
          assert.equal(connection.loginfo.args[1], 'unknown action: <missing>')
          resolve()
        },
        connection,
        [new Address('<test8@example.com>')],
      )
    })
  })

  it('should map * to test15-works@success.com', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.transaction.rcpt_to)
          assert.ok(Array.isArray(connection.transaction.rcpt_to))
          assert.deepEqual(
            connection.transaction.rcpt_to.pop(),
            new Address('<test15-works@success.com>'),
          )
          resolve()
        },
        connection,
        [new Address('test15@example.com')],
      )
    })
  })

  it('action alias should fail with loginfo on missing to', async () => {
    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.ok(connection.loginfo.called)
          assert.equal(
            connection.loginfo.args[1],
            'alias failed for test9, no "to" field in alias config',
          )
          resolve()
        },
        connection,
        [new Address('<test9@example.com>')],
      )
    })
  })

  it('should prefer more specific rule', async () => {
    plugin.cfg = {
      '@example.com': {
        action: 'alias',
        to: 'bar@example.com',
      },
      foo: {
        action: 'alias',
        to: 'foo@example.com',
      },
    }

    await new Promise((resolve) => {
      plugin.aliases(
        (action) => {
          assert.deepEqual(
            connection.transaction.rcpt_to.pop(),
            new Address('<foo@example.com>'),
          )
          resolve()
        },
        connection,
        [new Address('<foo-test@example.com>')],
      )
    })
  })

  it('single-target string alias updates params[0] to aliased address', async () => {
    const p = [new Address('<test5@example.com>')]
    await new Promise((resolve) => {
      plugin.aliases(
        () => {
          assert.equal(p[0].address, 'test5-works@success.com')
          resolve()
        },
        connection,
        p,
      )
    })
  })

  it('same-domain string alias updates params[0] but does not set queue.wants', async () => {
    const p = [new Address('<test3@example.com>')]
    await new Promise((resolve) => {
      plugin.aliases(
        () => {
          assert.equal(p[0].address, 'test3-works@example.com')
          assert.equal(
            connection.transaction.notes.get('queue.wants'),
            undefined,
          )
          resolve()
        },
        connection,
        p,
      )
    })
  })

  it('cross-domain string alias sets queue.wants to outbound', async () => {
    const p = [new Address('<test5@example.com>')]
    await new Promise((resolve) => {
      plugin.aliases(
        () => {
          assert.equal(
            connection.transaction.notes.get('queue.wants'),
            'outbound',
          )
          resolve()
        },
        connection,
        p,
      )
    })
  })

  it('multi-target array alias updates params[0] to first target', async () => {
    const p = [new Address('<test14@example.net>')]
    await new Promise((resolve) => {
      plugin.aliases(
        () => {
          assert.equal(p[0].address, 'alice@success.com')
          assert.equal(
            connection.transaction.notes.get('queue.wants'),
            'outbound',
          )
          resolve()
        },
        connection,
        p,
      )
    })
  })
})
