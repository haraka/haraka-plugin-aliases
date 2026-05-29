// aliases
// Do not run this plugin with the queue/smtp_proxy plugin.
const { Address } = require('@haraka/email-address')

exports.register = function () {
  this.inherits('queue/discard')

  this.load_aliases()

  this.register_hook('rcpt', 'aliases')
}

exports.load_aliases = function () {
  this.cfg = this.config.get('aliases.json', 'json', () => {
    this.load_aliases()
  })

  if (this.cfg === undefined) {
    this.cfg = this.config.get('aliases', 'json', () => {
      this.load_aliases()
    })
  }

  if (this.cfg === undefined) this.cfg = {}
}

exports.aliases = function (next, connection, params) {
  const { address: rcpt, user, host } = params[0]
  const match = findMatch(this.cfg, rcpt, user, host)
  if (match) applyMatch(this, connection, match, host, params)
  next()
}

function findMatch(cfg, rcpt, user, host) {
  const prefix = user.split(/[+-]/, 1)[0]
  const candidates = [
    [rcpt, rcpt],
    [user, rcpt],
    [`${prefix}@${host}`, rcpt],
    [prefix, rcpt],
    [`@${host}`, `@${host}`],
    ['*', null],
  ]
  for (const [key, drop] of candidates) {
    if (cfg[key]) return { key, action: cfg[key].action ?? '<missing>', drop }
  }
  return null
}

function applyMatch(plugin, connection, { key, action, drop }, host, params) {
  switch (action.toLowerCase()) {
    case 'drop':
      _drop(plugin, connection, drop)
      break
    case 'alias':
      _alias(plugin, connection, { key, config: plugin.cfg[key], host, params })
      break
    default:
      connection.loginfo(plugin, `unknown action: ${action}`)
  }
}

function _drop(plugin, connection, rcpt) {
  connection.loginfo(plugin, `marking ${rcpt} for drop`)
  if (!connection?.transaction?.notes) return
  connection.transaction.notes.discard = true
}

function _alias(plugin, connection, { key, config, host, params }) {
  if (!connection?.transaction) return
  if (!config.to) {
    connection.loginfo(
      plugin,
      `alias failed for ${key}, no "to" field in alias config`,
    )
    return
  }

  const txn = connection.transaction
  let firstTarget
  if (Array.isArray(config.to)) {
    connection.loginfo(plugin, `aliasing ${txn.rcpt_to} to ${config.to}`)
    txn.rcpt_to.pop()
    for (const addr of config.to) {
      txn.rcpt_to.push(new Address(`<${addr}>`))
    }
    firstTarget = config.to[0]
  } else {
    const to = config.to.search('@') === -1 ? `${config.to}@${host}` : config.to
    connection.loginfo(plugin, `aliasing ${txn.rcpt_to} to ${to}`)
    txn.rcpt_to.pop()
    txn.rcpt_to.push(new Address(`<${to}>`))
    firstTarget = to
  }

  if (params) {
    params[0] = new Address(`<${firstTarget}>`)
    const newHost = params[0].host
    if (newHost && newHost.toLowerCase() !== host.toLowerCase()) {
      if (!txn.notes.get('queue.wants')) {
        txn.notes.set('queue.wants', 'outbound')
      }
    }
  }

  txn.notes.forward = true
}
