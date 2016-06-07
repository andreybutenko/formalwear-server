'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const Schema = mongoose.Schema;
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times

// Model which saves post data
const PostSchema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, default: '' },
    imageUri: { type: String, default: '' },
    published: { type: 'Moment', default: new moment().unix() },
    prompts: { type: [String] },
    privacy: {
        discovery: { type: Boolean, default: true }
    }
})
.index({
    description: 'text',
    prompts: 'text'
});

module.exports = mongoose.model('Post', PostSchema);
