'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const Schema = mongoose.Schema;
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times

// Model which saves notification events
const NotificationSchema = new Schema({
    location: { type: Schema.Types.ObjectId, ref: 'Post' },
    source: { type: Schema.Types.ObjectId, ref: 'User' },
    recipient: { type: Schema.Types.ObjectId, ref: 'User' },
    time: { type: 'Moment', default: new moment().unix() },
    type: { type: String },
    seen: { type: Boolean, default: false }
})

module.exports = mongoose.model('Notification', NotificationSchema);
