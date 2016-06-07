'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times
const jwt = require('jsonwebtoken');    // JSON web tokens; user authentication
const request = require('request');     // Request; http client
const async = require('async');         // Async; manage chains of asynchronous tasks

// module dependencies
const validation = require('./validation.js');

// Models
const User = require('../Model/userSchema.js');

// create account
const create = function(data, callback) {
    data.setup = false;
    let newUser = new User(data);
    newUser.save(callback);

    console.log('Successfully created new account for ' + data.name.first + ' ' + data.name.last);
}

// modify account data; returns User object
const update = function(query, data, callback) {
    User.findOneAndUpdate(query, data, { 'new': true }, callback); // new flag returns updated contents
}

// get account data
const get = function(query, callback) {
    User.findOne(query, callback);
}

// add to an array like follow in account
const push = function(query, array, data, callback) {
    let newData = {};               // create empty object
    newData['$push'] = {};          // specify that we're pushing
    newData['$push'][array] = data; // put data into property named by array string parameter
    User.findOneAndUpdate(query, newData, { 'new': true }, callback); // new flag returns updated contents
}

// remove from an array like follow in account
const pull = function(query, array, data, callback) {
    let newData = {};               // create empty object
    newData['$pull'] = {};          // specify that we're pushing
    newData['$pull'][array] = data; // put data into property named by array string parameter
    User.findOneAndUpdate(query, newData, { 'new': true }, callback); // new flag returns updated contents
}

// follow another user
// user parameter: the Mongoose ObjectId of the user we're acting upon, whoever is doing the action of following
// toFollowId parameter: the id of the user that's to be followed, no changes are made to their account
const follow = function(user, toFollowId, callback) {
    async.waterfall([
        function(callback) { // ensure user doesn't already followe
            for(var i = 0; i < user.following.length; i++) {
                if(user.following[i] == toFollowId) {
                    callback('alreadyFollowing');
                    return;
                }
            }

            callback();
        },
        function(callback) { // find user to be followed
            get({ '_id': toFollowId }, callback);
        }
    ], function(err, toFollow) { // follow user
        if(!err) {
            push({ '_id': user['_id'] }, 'following', toFollow, callback);
        }
        else if(err == 'alreadyFollowing') {
            callback(null, user);
        }
        else {
            callback(err);
        }
    });
}

// unfollow another user
// user parameter: the Mongoose ObjectId of the user we're acting upon, whoever is doing the action of unfollowing
// toUnFollowId parameter: the id of the user that's to be unfollowed, no changes are made to their account
const unfollow = function(user, toUnFollowId, callback) {
    async.waterfall([
        function(callback) { // ensure user is following
            for(var i = 0; i < user.following.length; i++) {
                if(user.following[i] == toUnFollowId) {
                    callback(null);
                    return;
                }
            }

            callback('notFollowing');
        },
        function(callback) { // find user to be unfollowed
            get({ '_id': toUnFollowId }, callback);
        }
    ], function(err, toUnFollowId) { // unfollow user
        if(!err) {
            pull({ '_id': user['_id'] }, 'following', toUnFollowId['_id'], callback);
        }
        else if(err == 'notFollowing') {
            callback(null, user);
        }
        else {
            callback(err);
        }
    });
}

// get information about user
const getInfoConfidential = function(req, res, callback) {
    const required = ['token'];
    if(!validation.checkArgs(required, req, res)) return callback();

    User.findOne({ jwt: req.params.token }, function(err, user) {
        if(user == null)
            res.send(404, 'no user');
        else
            res.send(user);
    });
}

// get information about user without revealing confidential info
const getInfoSecure = function(userId, callback) {
    get({ '_id': userId }, function(err, user) {
        if(user != null) {
            user.jwt = undefined;
            user.fbUserId = undefined;
            user.fbAccessToken = undefined;
            user.fbTokenExpiry = undefined;
            user.emailAddress = undefined;
            user.passwordHash = undefined;
        }

        callback(err, user);
    });
}
const getInfoSecureWrapper = function(req, res, callback) {
    const required = ['id'];
    if(!validation.checkArgs(required, req, res)) return callback();
    getInfoSecure(req.params.id, function(err, user) {
        if(err) res.send(500, err);
        else {
            if(user == null) res.send(404, user);
            else res.send(200, user);
        }
    })
}

module.exports = {
    create: create,
    update: update,
    get: get,
    push: push,
    follow: follow,
    unfollow: unfollow,
    getInfoSecure: {
        internal: getInfoSecure,
        external: getInfoSecureWrapper
    },
    getInfoFull: getInfoConfidential
}
