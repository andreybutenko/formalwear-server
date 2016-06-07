'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times
const fs = require('fs');               // filesystem; standard module
const async = require('async');         // Async; manage chains of asynchronous tasks

// module dependencies
const account = require('./account.js');
const authentication = require('./authentication.js');
const search = require('./search.js');
const validation = require('./validation.js');

// Models
const User = require('../Model/userSchema.js');
const Post = require('../Model/postSchema.js');

// config
const config = require('../config.js');

// follow a user
const followUser = function followUser(req, res, callback) {
    const required = ['token', 'toFollowId'];
    if(!validation.checkArgs(required, req, res)) return callback();

    async.waterfall([
        function(callback) { // fetch user token
            authentication.token.getUser(req.params.token, callback)
        },
        function(user, callback) { // validate user
            if(user == null) {
                res.send(401, {
                    status: 'failed',
                    err: 'bad token'
                });
                return;
            }
            else {
                callback(null, user);
            }
        },
        function(user, callback) { // follow
            account.follow(user, req.params.toFollowId, callback);
        }
    ], function(err, newUser) {
        if(err)
            res.send(500, err);
        else
            res.send(newUser);
    });
}

// unfollow a user
const unfollowUser = function unfollowUser(req, res, callback) {
    const required = ['token', 'toUnFollowId'];
    if(!validation.checkArgs(required, req, res)) return callback();

    async.waterfall([
        function(callback) { // fetch user token
            authentication.token.getUser(req.params.token, callback)
        },
        function(user, callback) { // validate user
            if(user == null) {
                res.send(401, {
                    status: 'failed',
                    err: 'bad token'
                });
                return;
            }
            else {
                callback(null, user);
            }
        },
        function(user, callback) { // follow
            account.unfollow(user, req.params.toUnFollowId, callback);
        }
    ], function(err, newUser) {
        if(err)
            res.send(500, err);
        else
            res.send(newUser);
    });
}

// generate feed
const getFeed = function getFeed(req, res, callback) {
    const required = ['token'];
    if(!validation.checkArgs(required, req, res)) return callback();

    async.waterfall([
        function(callback) { // fetch user token
            authentication.token.getUser(req.params.token, callback)
        },
        function(user, callback) { // validate user
            if(user == null) {
                res.send(401, {
                    status: 'failed',
                    err: 'bad token'
                });
                return;
            }
            else {
                callback(null, user);
            }
        },
        function(user, callback) { // get posts in feed
            let query = {};
            query['$or'] = [];
            for(var i = 0; i < user.following.length; i++) {
                query['$or'].push({ 'author': user.following[i] });
            }
            if(query['$or'].indexOf(user['_id']) == -1) { // add own posts
                query['$or'].push({ 'author': user['_id'] });
            }

            /* pagination
            let page = req.params.interval; // zero-index
            let skip = 10 * page;
            let limit = skip + 10;*/
            let skip = 0;
            let limit = -1;

            search.post.query(query, 'post', skip, limit, callback);
        }
    ], function(err, posts) {
        if(err)
            res.send(500, err);
        else
            res.send(posts);
    });
}

// generate explore feed
const exploreFeed = function exploreFeed(req, res, callback) {
    const required = ['token'];
    if(!validation.checkArgs(required, req, res)) return callback();

    async.waterfall([
        function(callback) { // fetch user token
            authentication.token.getUser(req.params.token, callback)
        },
        function(user, callback) { // validate user
            if(user == null) {
                res.send(401, {
                    status: 'failed',
                    err: 'bad token'
                });
                return;
            }
            else {
                callback(null, user);
            }
        },
        function(user, callback) { // get posts in feed
            let query = { 'privacy.discovery': true };

            search.post.query(query, 'post', 0, -1, callback);
        }
    ], function(err, posts) {
        if(err)
            res.send(500, err);
        else
            res.send(posts);
    });
}

// generate user feed
const userFeed = function userFeed(req, res, callback) {
    const required = ['token', 'userId'];
    if(!validation.checkArgs(required, req, res)) return callback();

    async.waterfall([
        function(callback) { // fetch user token
            authentication.token.getUser(req.params.token, callback)
        },
        function(user, callback) { // validate user
            if(user == null) {
                res.send(401, {
                    status: 'failed',
                    err: 'bad token'
                });
                return;
            }
            else {
                callback(null, user);
            }
        },
        function(user, callback) { // get posts in feed
            let query = { 'author': req.params.userId };

            search.post.query(query, 'post', 0, -1, callback);
        }
    ], function(err, posts) {
        if(err)
            res.send(500, err);
        else
            res.send(posts);
    });
}

module.exports = {
    follow: followUser,
    unfollow: unfollowUser,
    get: getFeed,
    explore: exploreFeed,
    user: userFeed
}
