'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const Schema = mongoose.Schema;
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times

// Model which saves responses and associated votes
const ResponseSchema = new Schema({
    postId: { type: Schema.Types.ObjectId, ref: 'Post' },
    promptIndex: { type: Number },
    voterId: { type: Schema.Types.ObjectId, ref: 'User' },
    response: { type: Boolean }
});

module.exports = mongoose.model('Response', ResponseSchema);
