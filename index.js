// aliases
// Do not run this plugin with the queue/smtp_proxy plugin.
const Address = require('address-rfc2821').Address

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
  const cfg = this.cfg
  const rcpt = params[0].address()
  const user = params[0].user
  const host = params[0].host

  let match = user.split(/[+-]/, 1)
  let action = '<missing>'

  const onMatch = (alias1, action1, drop1) => {
    switch (action.toLowerCase()) {
      case 'drop':
        _drop(this, connection, drop1)
        break
      case 'alias':
        _alias(this, connection, alias1, cfg[alias1], host)
        break
      default:
        connection.loginfo(this, `unknown action: ${action1}`)
    }
  }

  if (cfg[rcpt]) {
    // full email address match
    match = rcpt
    if (cfg[match].action) action = cfg[match].action
    onMatch(match, action, rcpt)
  } else if (cfg[user]) {
    // user only match
    match = user
    if (cfg[user].action) action = cfg[user].action
    onMatch(match, action, rcpt)
  } else if (cfg[`${match[0]}@${host}`]) {
    // user prefix + domain match
    match = `${match[0]}@${host}`
    if (cfg[match].action) action = cfg[match].action
    onMatch(match, action, rcpt)
  } else if (cfg[match[0]]) {
    // user prefix
    match = match[0]
    if (cfg[match].action) action = cfg[match].action
    onMatch(match, action, rcpt)
  } else if (cfg[`@${host}`]) {
    // @domain match
    match = `@${host}`
    if (cfg[match].action) action = cfg[match].action
    onMatch(match, action, match)
  } else if (cfg['*']) {
    // Match *. When having a * in the alias list it will rewrite all emails that have not been matched by the above rules
    if (cfg['*'].action) action = cfg['*'].action
    onMatch('*', action)
  }

  next()
}

function _drop(plugin, connection, rcpt) {
  connection.loginfo(plugin, `marking ${rcpt} for drop`)
  if (!connection?.transaction?.notes) return
  connection.transaction.notes.discard = true
}

function _alias(plugin, connection, key, config, host) {
  if (!connection?.transaction) return
  if (!config.to) {
    connection.loginfo(
      plugin,
      `alias failed for ${key}, no "to" field in alias config`,
    )
    return
  }

  const txn = connection.transaction
  if (Array.isArray(config.to)) {
    connection.loginfo(plugin, `aliasing ${txn.rcpt_to} to ${config.to}`)
    txn.rcpt_to.pop()
    for (const addr of config.to) {
      txn.rcpt_to.push(new Address(`<${addr}>`))
    }
  } else {
    const to = config.to.search('@') === -1 ? `${config.to}@${host}` : config.to
    connection.loginfo(plugin, `aliasing ${txn.rcpt_to} to ${to}`)
    txn.rcpt_to.pop()
    txn.rcpt_to.push(new Address(`<${to}>`))
  }

  txn.notes.forward = true
}
