
// node.js built-in modules
const assert   = require('assert');

// npm modules
const fixtures = require('haraka-test-fixtures');

// start of tests
//    assert: https://nodejs.org/api/assert.html
//    mocha: http://mochajs.org

beforeEach(function (done) {
    this.plugin = new fixtures.plugin('aliases');
    done();  // if a test hangs, assure you called done()
});

describe('aliases', function () {
    it('loads', function (done) {
        assert.ok(this.plugin);
        done();
    });
});

describe('load_aliases_ini', function () {
    it('loads aliases.ini from config/aliases.ini', function (done) {
        this.plugin.load_aliases_ini();
        assert.ok(this.plugin.cfg);
        done();
    });

    it('initializes enabled boolean', function (done) {
        this.plugin.load_aliases_ini();
        assert.equal(this.plugin.cfg.main.enabled, true, this.plugin.cfg);
        done();
    });
});
