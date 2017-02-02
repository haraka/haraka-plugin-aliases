'use strict';

exports.register = function () {
    let plugin = this;
    plugin.load_aliases_ini();
}

exports.load_aliases_ini = function () {
    let plugin = this;

    plugin.cfg = plugin.config.get('aliases.ini', {
        booleans: [
            '+enabled',               // plugins.cfg.main.enabled=true
            '-disabled',              // plugins.cfg.main.disabled=false
            '+feature_section.yes'    // plugins.cfg.feature_section.yes=true
        ]
    },
    function () {
        plugin.load_example_ini();
    });
}
