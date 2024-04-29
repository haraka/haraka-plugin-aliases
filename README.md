[![Build Status][ci-img]][ci-url]
[![Code Climate][clim-img]][clim-url]
[![NPM][npm-img]][npm-url]

# haraka-plugin-aliases

This plugin allows the configuration of aliases that perform an action or change the RCPT address. Aliases are specified in a JSON formatted config file, and must have an action. Syntax errors found in the JSON config will stop the server.

IMPORTANT: this plugin must appear in `config/plugins` before other plugins that run on hook_rcpt

WARNING: DO NOT USE THIS PLUGIN WITH queue/smtp_proxy.

## Configuration

### aliases

JSON formatted config file that contains keys to match against RCPT addresses, and values that are objects with an "action" : "<action>" property. Example:

```json
{ "test1": { "action": "drop" } }
```

In the above example the "test1" alias will drop any message that matches test1, test1-_, or test1+_ (wildcard '-' or '+', see below). Actions may have 0 or more options listed like so:

```json
{ "test3": { "action": "alias", "to": "test3-works" } }
```

In the above example the "test3" alias has an action of "alias" and a mandatory "to" field. If "to" were missing the alias would fail and an error would be emitted.

Aliases of 'user', '@host' and 'user@host' possible:

```json
{ "demo" : { "action" : "drop" } }
    or
{ "@example.com" : { "action" : "drop" } }
    or
{ "demo@example.com" : { "action" : "drop" } }
```

Aliases may be expanded to multiple recipients:

```json
{
  "sales@example.com": {
    "action": "alias",
    "to": ["alice@example.com", "bob@example.com"]
  }
}
```

### wildcard notation

This plugin supports wildcard matching of aliases against the right most string of a RCPT address. The characters '-' and '+' are commonly used for subaddressing and this plugin can alias the "user" part of the address.

If the address were test2-testing@example.com (or test2+testing@example.com), the below alias would match:

```json
{ "test2": { "action": "drop" } }
```

Larger and more specific aliases match first when using wildcard '-' notation. If the above RCPT was evaluated with this alias config, it would alias:

```json
{
  "test2": { "action": "drop" },
  "test2-testing": { "action": "alias", "to": "test@foo.com" }
}
```

It also allows you to route all emails to a certain domain:

```json
{
  "*": { "action": "alias", "to": "test15-works@success.com" }
}
```

#### chaining and circuits

Alias chaining is not supported. As a side-effect, we enjoy protections against alias circuits.

- optional one line formatting

Any valid JSON will due. Please consider keeping each alias on its own line so that others that wish to grep the aliases file have an easier time finding the full configuration for an alias.

- nondeterministic duplicate matches

This plugin was written with speed in mind. That means every lookup hashes into the alias file for its match. While the act of doing so is fast, it does mean that any duplicate alias entries will match nondeterministically. That is, we cannot predict what will happen here:

```json
{
  "coinflip": { "action": "alias", "to": "heads@coin.com" },
  "coinflip": { "action": "alias", "to": "tails@coin.com" }
}
```

Due to node.js implementation, one result will likely always be chosen over the other, so this is not exactly a coinflip. We simply cannot say what the language implementation will do and it could change.

## action (required)

The following is a list of supported actions and their options.

- drop

  Drops a message while pretending everything was okay to the sender. This acts like an alias to /dev/null.

- alias

  Maps the alias key to the address specified in the "to" option. A note about matching in addition to the note about wildcard '-' above. When we match an alias, we store the hostname of the match for a shortcut substitution syntax later.

  - to (required)

  This option is the full address, or local part at matched hostname that the RCPT address will be re-written to. For an example of an alias to a full address consider the following:

  ```json
  { "test5": { "action": "alias", "to": "test5@foo.com" } }
  ```

  This maps RCPT matches for "test5" to "test5-works@foo.com". This would map "test5@somedomain.com" to "test5-works@foo.com" every time. Compare this notation with its shortcut counterpart, best used when the "to" address is at the same domain as the match:

  ```json
  { "test4": { "action": "alias", "to": "test4" } }
  ```

  This notation is more compact. Mail to "test4-foo@anydomain.com" will map to "test4@anydomain.com". This notation enables lots of aliases on a single domain to map to other local parts at the same domain.

## Example Configuration

```json
{
  "test1": { "action": "drop" },
  "test2": { "action": "drop" },
  "test3": { "action": "alias", "to": "test3-works" },
  "test4": { "action": "alias", "to": "test4" },
  "test5": { "action": "alias", "to": "test5-works@success.com" },
  "test6": { "action": "alias", "to": "test6-works@success.com" }
}
```

<!-- leave these buried at the bottom of the document -->

[ci-img]: https://github.com/haraka/haraka-plugin-aliases/actions/workflows/ci.yml/badge.svg
[ci-url]: https://github.com/haraka/haraka-plugin-aliases/actions/workflows/ci.yml
[cov-img]: https://codecov.io/github/haraka/haraka-plugin-aliases/coverage.svg
[cov-url]: https://codecov.io/github/haraka/haraka-plugin-aliases
[clim-img]: https://codeclimate.com/github/haraka/haraka-plugin-aliases/badges/gpa.svg
[clim-url]: https://codeclimate.com/github/haraka/haraka-plugin-aliases
[npm-img]: https://nodei.co/npm/haraka-plugin-aliases.png
[npm-url]: https://www.npmjs.com/package/haraka-plugin-aliases
