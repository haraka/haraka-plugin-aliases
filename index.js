// aliases
// Do not run this plugin with the queue/smtp_proxy plugin.
const Address = require('address-rfc2821').Address;

exports.register = function () {
    this.inherits('queue/discard')

    this.load_aliases()

    this.register_hook('rcpt', 'aliases')
};

exports.load_aliases = function () {
    const plugin = this
    plugin.cfg = plugin.config.get('aliases', 'json', function () {
        plugin.load_aliases()
    })
    if (plugin.cfg === undefined) plugin.cfg = {}
}

exports.aliases = function (next, connection, params) {
    const plugin = this
    const cfg    = plugin.cfg
    const rcpt   = params[0].address()
    const user   = params[0].user
    const host   = params[0].host

    let match  = user.split(/[+-]/, 1)
    let action = '<missing>'

    function onMatch (alias1, action1, drop1) {
        switch (action.toLowerCase()) {
            case 'drop':
                _drop(plugin, connection, drop1)
                break;
            case 'alias':
                _alias(plugin, connection, alias1, cfg[alias1], host)
                break;
            default:
                connection.loginfo(plugin, `unknown action: ${action1}`)
        }
    }

    if (cfg[rcpt]) {                    // full email address match
        match = rcpt
        if (cfg[match].action) action = cfg[match].action
        onMatch(match, action, rcpt)
    }

    if (cfg[`@${host}`]) {              // @domain match
        match = `@${host}`
        if (cfg[match].action) action = cfg[match].action
        onMatch(match, action, match)
    }

    if (cfg[user]) {                    // user only match
        match = user
        if (cfg[user].action) action = cfg[user].action
        onMatch(match, action, rcpt)
    }
    else if (cfg[match[0]]) {
        match = match[0]
        if (cfg[match].action) action = cfg[match].action
        onMatch(match, action, rcpt)
    }
    else if (cfg[`${match[0]}@${host}`]) { // user prefix + domain match
        match = `${match[0]}@${host}`
        if (cfg[match].action) action = cfg[match].action
        onMatch(match, action, rcpt)
    }

    next()
}

function _drop (plugin, connection, rcpt) {
    connection.logdebug(plugin, `marking ${rcpt} for drop`)
    if (!connection?.transaction?.notes) return
    connection.transaction.notes.discard = true
}

function _alias (plugin, connection, key, config, host) {
    if (!connection?.transaction) return
    if (!config.to) {
        connection.loginfo(plugin, `alias failed for ${key}, no "to" field in alias config`)
        return
    }

    const txn = connection.transaction
    if (Array.isArray(config.to)) {
        connection.logdebug(plugin, `aliasing ${txn.rcpt_to} to ${config.to}`)
        txn.rcpt_to.pop()
        config.to.forEach(addr => {
            txn.rcpt_to.push(new Address(`<${addr}>`))
        })
    }
    else {
        const to = config.to.search('@') === -1 ? `${config.to}@${host}` : config.to
        connection.logdebug(plugin, `aliasing ${txn.rcpt_to} to ${to}`)
        txn.rcpt_to.pop()
        txn.rcpt_to.push(new Address(`<${to}>`))
    }

    txn.notes.forward = true
}
