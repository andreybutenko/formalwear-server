'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const Schema = mongoose.Schema;
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times

// Model which saves comments
const CommentSchema = new Schema({
    postId: { type: Schema.Types.ObjectId, ref: 'Post' },
    commenterId: { type: Schema.Types.ObjectId, ref: 'User' },
    published: { type: 'Moment', default: new moment().unix() },
    comment: { type: String }
});

module.exports = mongoose.model('Comment', CommentSchema);
