'use strict'
// external dependencies
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times

// module dependencies
const validation = require('./validation.js');

const humanTime = function humanTime(req, res, callback) {
    const required = ['date'];
    if(!validation.checkArgs(required, req, res)) return callback();

    res.send(moment.unix(req.params.date).fromNow());
}

module.exports = {
    humanize: humanTime
}
