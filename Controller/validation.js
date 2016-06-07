'use strict'
// module dependencies
const authentication = require('./validation.js');

// ensure request contains all required info. Returns true if yes, false if no.
const checkRequiredArguments = function checkRequiredArguments(required, req, res) {
    let missing = [];

    for(var i = 0; i < required.length; i++) {
        let checking = required[i];
        if(req.params[checking] === undefined) {
            missing.push(checking);
        }
    }

    if(missing.length > 0) {
        res.send(400, {
            status: 'failed',
            missing: missing,
            recieved: req.params
        });

        return false;
    }

    return true;
}

// sanitize text
const sanitizeText = function sanitizeText(text) {
    return String(text);
}

module.exports = {
    checkArgs: checkRequiredArguments,
    sanitizeText: sanitizeText
};
