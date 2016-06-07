'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times
const fs = require('fs');               // filesystem; standard module
const async = require('async');         // Async; manage chains of asynchronous tasks

// module dependencies
const account = require('./account.js');
const authentication = require('./authentication.js');
const validation = require('./validation.js');

// Models
const User = require('../Model/userSchema.js');
const Post = require('../Model/postSchema.js');

// config
const config = require('../config.js');

// find posts by query
const postQuery = function postQuery(query, source, skip, limit, callback) {
    let searchModel;
    if(source == 'user')
        searchModel = User;
    else if(source == 'post')
        searchModel = Post;
    else
        callback('No source specified!');

    searchModel
        .find(query)
        .sort({ 'published': 'descending' })
        //.skip(skip)
        //.limit(limit)
        .exec(callback);
}

// actual seaqrch
const search = function search(req, res, callback) {
    const required = ['query'];
    if(!validation.checkArgs(required, req, res)) return callback();

    let found = {};
    let query = {
        /*$or: [
            {*/
                $text: {
                    $search: req.params.query
                }
            /*},
            {
                'name.first': req.params.query,
            },
            {
                'name.last': req.params.query
            }
        ]*/
    }

    async.waterfall([
        function(callback) { // find users
            User.find(query, callback);
        },
        function(results, callback) { //find posts
            for(var i = 0; i < results.length; i++) {
                results[i].jwt = undefined;
                results[i].fbUserId = undefined;
                results[i].fbAccessToken = undefined;
                results[i].fbTokenExpiry = undefined;
                results[i].emailAddress = undefined;
                results[i].passwordHash = undefined;
            }
            found.users = results;
            Post.find(query, callback);
        },
        function(results, callback) {
            found.posts = results;
            callback();
        }
    ], function(err) {
        if(err)
            res.send(500, err);
        else {
            res.send({
                status: 'success',
                response: found
            });
        }
    });
}

module.exports = {
    post: {
        query: postQuery
    },
    search: search
}
