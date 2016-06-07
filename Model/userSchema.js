'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const Schema = mongoose.Schema;
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times

// Model which saves users and associated data
const UserSchema = new Schema({
    name: {
        first: { type: String },
        last: { type: String }
    },
    imageUrl: { type: String, default: '/images/default.png' },

    description: { type: String },
    school: { type: String },
    clubs: { type: [String] },

    following: { type: [Schema.Types.ObjectId], ref: 'User' },

    jwt: { type: String },
    setup: { type: Boolean, default: false },

    emailAddress: { type: String },
    passwordHash: { type: String },

    fbUserId: { type: String },
    fbAccessToken: { type: String },
    fbTokenExpiry: { type: 'Moment' }
})
.index({
    name: {
        first: 'text',
        last: 'text'
    },
    description: 'text',
    school: 'text',
    clubs: 'text'
});

module.exports = mongoose.model('User', UserSchema);
