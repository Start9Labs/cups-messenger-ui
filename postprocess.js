"use strict";
exports.__esModule = true;
var node_html_parser_1 = require("node-html-parser");
var fs = require("fs");
var index = fs.readFileSync('./www/index.html').toString('utf-8');
var root = node_html_parser_1.parse(index);
for (var _i = 0, _a = root.querySelectorAll("link"); _i < _a.length; _i++) {
    var elem = _a[_i];
    if (elem.getAttribute("rel") === "stylesheet") {
        var sheet = fs.readFileSync('./www/' + elem.getAttribute('href')).toString('utf-8');
        index = index.replace(elem.toString(), '<style>' + sheet + '</style>');
    }
}
fs.writeFileSync('./www/index.html', index);
