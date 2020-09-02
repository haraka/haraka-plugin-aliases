// aliases
// Do not run this plugin with the queue/smtp_proxy plugin.
const Address = require('address-rfc2821').Address;

exports.register = function () {
    this.inherits('queue/discard');

    this.load_aliases();

    this.register_hook('rcpt', 'aliases');
};

exports.load_aliases = function () {
    const plugin = this;
    plugin.cfg = plugin.config.get('aliases', 'json', function () {
        plugin.load_aliases();
    }) || {};
}

exports.aliases = function (next, connection, params) {
    const plugin = this;
    const cfg = plugin.cfg;
    const rcpt   = params[0].address();
    const user   = params[0].user;
    const host   = params[0].host;

    let match  = user.split(/[+-]/, 1);
    let action = "<missing>";

    function onMatch (match1, action1) {
        switch (action.toLowerCase()) {
            case 'drop':
                _drop(plugin, connection, match1);
                break;
            case 'alias':
                _alias(plugin, connection, match1, cfg[match1], host);
                break;
            default:
                connection.loginfo(plugin, "unknown action: " + action1);
        }
        next();
    }

    // full email address match
    if (cfg[rcpt]) {
        if (cfg[rcpt].action) action = cfg[rcpt].action;
        return onMatch(rcpt, action);
    }

    // @domain match
    const dom_match = `@${host}`;
    if (cfg[`@${host}`]) {
        if (cfg[dom_match].action) action = cfg[dom_match].action;
        match = dom_match;
        return onMatch(dom_match, action);
    }

    // user only match
    if (cfg[user]) {
        if (cfg[user].action) action = cfg[user].action;
        return onMatch(user, action);
    }

    // user prefix match
    if (cfg[match[0]]) {
        if (cfg[match[0]].action) action = cfg[match[0]].action;
        return onMatch(match[0], action);
    }

    // user prefix + domain match
    const prefix_dom = `${match[0]}@${host}`;
    if (cfg[prefix_dom]) {
        if (cfg[prefix_dom].action) action = cfg[prefix_dom].action;
        return onMatch(prefix_dom, action);
    }

    // Match  *. Rewrite all emails that are not matching to this
    if (cfg["*"]) {
        if (cfg["*"].action) action = cfg["*"].action;
        return onMatch("*", action);
    }
    

    next();
};

function _drop (plugin, connection, rcpt) {
    connection.logdebug(plugin, "marking " + rcpt + " for drop");
    connection.transaction.notes.discard = true;
}

function _alias (plugin, connection, key, config, host) {
    const txn = connection.transaction;

    if (!config.to) {
        connection.loginfo(plugin, `alias failed for ${key}, no "to" field in alias config`);
        return;
    }

    if (Array.isArray(config.to)) {
        connection.logdebug(plugin, `aliasing ${txn.rcpt_to} to ${config.to}`);
        txn.rcpt_to.pop();
        config.to.forEach((addr) => {
            txn.rcpt_to.push(new Address(`<${addr}>`));
        })
        return;
    }

    let to = config.to;
    if (to.search("@") === -1) {
        to = config.to + '@' + host;
    }

    connection.logdebug(plugin, "aliasing " + txn.rcpt_to + " to " + to);
    txn.rcpt_to.pop();
    txn.rcpt_to.push(new Address(`<${to}>`));
}
