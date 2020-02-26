"use strict";
exports.__esModule = true;
var fs = require("fs");
var cups_res_parser_1 = require("cups-res-parser");
var cups_res_parser_2 = require("src/app/services/cups/cups-res-parser");
var res = fs.readFileSync('./contacts-res');
console.log(JSON.stringify(cups_res_parser_1.pullContact(res)));
console.log(cups_res_parser_2.onionToPubkeyString('g4sg4ubw5z4gi7uj7xncxxcpur542ab34dmlfxs4wxqw7xt6wi7echid'));
