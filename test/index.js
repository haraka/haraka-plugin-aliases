'use strict'

const assert = require('node:assert')
const { describe, it, beforeEach } = require('node:test')

const { Address } = require('@haraka/email-address')
const {
  callRcpt,
  makeConnection,
  makePlugin,
  stub,
} = require('haraka-test-fixtures')

let plugin, params, connection

const _set_up = () => {
  plugin = makePlugin('aliases', { register: false, configDir: 'test' })
  params = [new Address('<test1@example.com>')]

  connection = makeConnection({ withTxn: true })
  connection.transaction.rcpt_to = [params]
  connection.loginfo = stub()

  plugin.inherits = stub()

  plugin.register()
}

// Run the aliases hook. addrOrParams may be an address string or a pre-built
// params array (for tests that need to inspect the array after the call).
const runAlias = (addrOrParams) => {
  if (Array.isArray(addrOrParams)) {
    return new Promise((resolve) =>
      plugin.aliases(resolve, connection, addrOrParams),
    )
  }
  return callRcpt(plugin, connection, addrOrParams)
}

const assertMapsTo = async (from, to) => {
  await runAlias(from)
  assert.ok(Array.isArray(connection.transaction.rcpt_to))
  assert.deepEqual(connection.transaction.rcpt_to.pop(), new Address(to))
}

const assertDropped = async (addr) => {
  await runAlias(addr)
  assert.ok(connection.transaction.notes.discard)
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
    assert.equal(await runAlias(params), undefined)
  })

  it('should drop test1@example.com', async () => {
    await assertDropped('<test1@example.com>')
  })

  it('should drop test2-testing@example.com', async () => {
    await assertDropped('<test2-testing@example.com>')
  })

  it('should drop test2-specific@example.com', async () => {
    await runAlias('<test2-specific@example.com>')
    assert.equal(connection.transaction.notes.discard, undefined)
    assert.deepEqual(
      connection.transaction.rcpt_to.pop(),
      new Address('<test2@example.com>'),
    )
  })

  it('should map test3@example.com to test3-works@example.com', async () => {
    await assertMapsTo('<test3@example.com>', '<test3-works@example.com>')
  })

  it('should map test4-testing@example.com to test4@example.com', async () => {
    await assertMapsTo('<test4-testing@example.com>', '<test4@example.com>')
  })

  it('should map test4+testing@example.com to test4@example.com', async () => {
    await assertMapsTo('<test4+testing@example.com>', '<test4@example.com>')
  })

  it('should map test5@example.com to test5-works@success.com', async () => {
    await assertMapsTo('<test5@example.com>', '<test5-works@success.com>')
  })

  it('should map test6-testing@example.com to test6-works@success.com', async () => {
    await assertMapsTo(
      '<test6-testing@example.com>',
      '<test6-works@success.com>',
    )
  })

  it('should drop @example.co', async () => {
    await assertDropped('<oc.elpmaxe@example.co>')
  })

  it('should drop test11@example.com', async () => {
    await assertDropped('<test11@example.org>')
  })

  it('should map @demo.com to test12-works@success.com', async () => {
    await assertMapsTo('<demo2014@demo.com>', '<test12-works@success.com>')
  })

  it('should map test13@example.net to test13-works@success.com', async () => {
    await assertMapsTo('<test13@example.net>', '<test13-works@success.com>')
  })

  it('should map test13+subaddress@example.net to test13-works@success.com', async () => {
    await assertMapsTo(
      '<test13+subaddress@example.net>',
      '<test13-works@success.com>',
    )
  })

  it('should explode test14@example.net to alice@success.com and bob@success.com', async () => {
    await runAlias('<test14@example.net>')
    assert.ok(Array.isArray(connection.transaction.rcpt_to))
    assert.deepEqual(connection.transaction.rcpt_to, [
      new Address('<alice@success.com>'),
      new Address('<bob@success.com>'),
    ])
  })

  it('should not drop test1@example.com, no config', async () => {
    plugin.cfg = {}
    await runAlias('<test1@example.com>')
    assert.equal(undefined, connection.transaction.notes.discard)
  })

  it('should fail with loginfo on unknown action', async () => {
    await runAlias('<test7@example.com>')
    assert.ok(connection.loginfo.called)
    assert.equal(
      connection.loginfo.args[1],
      `unknown action: ${plugin.cfg.test7.action}`,
    )
  })

  it('should fail with loginfo on missing action', async () => {
    await runAlias('<test8@example.com>')
    assert.ok(connection.loginfo.called)
    assert.equal(connection.loginfo.args[1], 'unknown action: <missing>')
  })

  it('should map * to test15-works@success.com', async () => {
    await assertMapsTo('test15@example.com', '<test15-works@success.com>')
  })

  it('action alias should fail with loginfo on missing to', async () => {
    await runAlias('<test9@example.com>')
    assert.ok(connection.loginfo.called)
    assert.equal(
      connection.loginfo.args[1],
      'alias failed for test9, no "to" field in alias config',
    )
  })

  it('should prefer more specific rule', async () => {
    plugin.cfg = {
      '@example.com': { action: 'alias', to: 'bar@example.com' },
      foo: { action: 'alias', to: 'foo@example.com' },
    }
    await assertMapsTo('<foo-test@example.com>', '<foo@example.com>')
  })

  it('single-target string alias updates params[0] to aliased address', async () => {
    const p = [new Address('<test5@example.com>')]
    await runAlias(p)
    assert.equal(p[0].address, 'test5-works@success.com')
  })

  it('same-domain string alias updates params[0] but does not set queue.wants', async () => {
    const p = [new Address('<test3@example.com>')]
    await runAlias(p)
    assert.equal(p[0].address, 'test3-works@example.com')
    assert.equal(connection.transaction.notes.get('queue.wants'), undefined)
  })

  it('cross-domain string alias sets queue.wants to outbound', async () => {
    const p = [new Address('<test5@example.com>')]
    await runAlias(p)
    assert.equal(connection.transaction.notes.get('queue.wants'), 'outbound')
  })

  it('multi-target array alias updates params[0] to first target', async () => {
    const p = [new Address('<test14@example.net>')]
    await runAlias(p)
    assert.equal(p[0].address, 'alice@success.com')
    assert.equal(connection.transaction.notes.get('queue.wants'), 'outbound')
  })
})

describe('load_aliases', () => {
  let plugin

  beforeEach(() => {
    plugin = makePlugin('aliases', { register: false })
  })

  it('falls back to legacy "aliases" file when "aliases.json" is missing', () => {
    const calls = []
    plugin.config = {
      get(name, type) {
        calls.push({ name, type })
        if (name === 'aliases.json') return undefined
        if (name === 'aliases') return { foo: { action: 'drop' } }
      },
    }

    plugin.load_aliases()

    assert.deepEqual(plugin.cfg, { foo: { action: 'drop' } })
    assert.deepEqual(
      calls.map((c) => c.name),
      ['aliases.json', 'aliases'],
    )
  })

  it('defaults cfg to {} when both lookups return undefined', () => {
    plugin.config = {
      get() {
        return undefined
      },
    }

    plugin.load_aliases()

    assert.deepEqual(plugin.cfg, {})
  })

  it('aliases.json watchCb reloads cfg on file change', () => {
    const reloaded = [
      { first: { action: 'drop' } },
      { second: { action: 'drop' } },
    ]
    let getCalls = 0
    let savedCb
    plugin.config = {
      get(name, type, cb) {
        if (name !== 'aliases.json') return undefined
        savedCb = cb
        return reloaded[getCalls++]
      },
    }

    plugin.load_aliases()
    assert.deepEqual(plugin.cfg, reloaded[0])
    assert.equal(typeof savedCb, 'function')

    // simulate haraka-config firing the watchCb after the file changes
    savedCb()
    assert.deepEqual(plugin.cfg, reloaded[1])
  })

  it('legacy "aliases" watchCb reloads cfg on file change', () => {
    const reloaded = [{ a: { action: 'drop' } }, { b: { action: 'drop' } }]
    let legacyCalls = 0
    let savedLegacyCb
    plugin.config = {
      get(name, type, cb) {
        if (name === 'aliases.json') return undefined
        if (name === 'aliases') {
          savedLegacyCb = cb
          return reloaded[legacyCalls++]
        }
      },
    }

    plugin.load_aliases()
    assert.deepEqual(plugin.cfg, reloaded[0])
    assert.equal(typeof savedLegacyCb, 'function')

    savedLegacyCb()
    assert.deepEqual(plugin.cfg, reloaded[1])
  })
})
