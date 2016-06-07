'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times
const fs = require('fs');               // filesystem; standard module
const request = require('request');     // Request; http client
const async = require('async');         // Async; manage chains of asynchronous tasks
const bcrypt = require('bcrypt-nodejs');// bcrypt; password hashing
const AWS = require('aws-sdk');         // Amazon Web Storage; for hosting on AWS

// module dependencies
const account = require('./account.js');
const authentication = require('./authentication.js');
const post = require('./post.js');
const validation = require('./validation.js');

// Models
const Post = require('../Model/postSchema.js');

// config
const config = require('../config.js');

// update name, bio, school, clubs. Public and text-based things
const updateGeneral = function updateGeneral(req, res, callback) {
    const required = ['token', 'firstName', 'lastName', 'description', 'school', 'clubs'];
    if(!validation.checkArgs(required, req, res)) return callback();

    async.waterfall([
        function(callback) { // fetch user token
            authentication.token.getUser(req.params.token, callback)
        },
        function(user, callback) { // validate user
            if(user == null) {
                res.send(401, 'Bad token. Log in again and try again.');
                return;
            }
            else {
                callback(null, user);
            }
        },
        function(user, callback) { // validate clubs list
            var clubs = req.params.clubs;
            var err = 'Clubs are not in a proper array.';

            if(!Array.isArray(clubs)) { // prompts must be in array
                res.send(401, err);
                console.log('Denied bad club array; not in array!');
                return;
            }

            for(var i = 0; i < clubs.length; i++) { // array must be made up of only Strings
                if(typeof clubs[i] != 'string') {
                    res.send(401, err);
                    console.log('Denied bad club array; contents not string!');
                    return;
                }
            }

            callback(null, user);
        },
        function (user, callback) { // update
            account.update({ '_id': user['_id'] }, {
                name: {
                    first: req.params.firstName,
                    last: req.params.lastName
                },
                description: req.params.description,
                school: req.params.school,
                clubs: req.params.clubs,
                setup: true
            }, callback);
        }
    ], function (err, user) {
        if(err)
            res.send(500, err);
        else
            res.send(200, 'Profile information updated!');
    });
}

// update profile image
const updateImage = function updateImage(req, res, callback) {
    const required = ['token', 'picture'];
    if(!validation.checkArgs(required, req, res)) return callback();

    async.waterfall([
        function(callback) { // fetch user token
            authentication.token.getUser(req.params.token, callback)
        },
        function(user, callback) { // validate user
            if(user == null) {
                res.send(401, 'Bad token. Log in again and try again.');
                return;
            }
            else {
                callback(null, user);
            }
        },
        function(user, callback) { // save image
            let fileName = post.genUrl();
            let uri = config.root + 'images/' + fileName + '.png';
            fs.writeFile(uri, req.params.picture, { encoding: 'base64', flag: 'w+' }, function(err) {
                callback(err, user, fileName);
            });
        },
        function(user, fileName, callback) { // if using s3, upload
            if(config.storage.useAWS == true) {

                let uri = config.root + 'images/' + fileName + '.png';
                fs.readFile(uri, function (err, data) {
                    if(err) {
                        return err;
                    }

                    const s3 = new AWS.S3(config.storage.aws);
                    const params = {
                        Bucket: config.storage.aws.params.Bucket,
                        Key: fileName + '.png',
                        Body: data
                    }

                    s3.putObject(params, function(err, data) {
                        callback(err, user, fileName);
                    })
                });
            }
        },
        function (user, fileName, callback) { // update
            account.update({ '_id': user['_id'] }, {
                imageUrl: '/images/' + fileName + '.png'
            }, callback);
        }
    ], function (err, user) {
        if(err)
            res.send(500, err);
        else
            res.send(200, 'Picture updated!');
    });
}

// update secure info: email, password
const updateSecure = function updateSecure(req, res, callback) {
    const required = ['token', 'email', 'password', 'newPassword'];
    if(!validation.checkArgs(required, req, res)) return callback();

    async.waterfall([
        function(callback) { // fetch user token
            authentication.token.getUser(req.params.token, callback)
        },
        function(user, callback) { // validate user
            if(user == null) {
                res.send(401, 'Bad token. Log in again and try again.');
                return;
            }
            else {
                callback(null, user);
            }
        },
        function (user, callback) { //check password
            bcrypt.compare(req.params.password, user.passwordHash, function(err, match) {
                if(err)
                    return callback(err);
                if(match)
                    return callback(null, user);
                else
                    return res.send(401, 'Incorrect password. Password and email are unchanged.');
            });
        },
        function (user, callback) { // hash new password, if necassary
            if(req.params.newPassword != null) {
                bcrypt.hash(req.params.newPassword, null, null, function(err, hash) {
                    if(err)
                        return callback(err);
                    else
                        callback(null, user, hash);
                });
            }
            else {
                callback(null, user, 'nohash');
            }
        },
        function (user, hash, callback) { // update user
            let data = {};
            if(req.params.newPassword != null) {
                data = {
                    emailAddress: req.params.email,
                    passwordHash: hash
                };
            }
            else {
                data = {
                    emailAddress: req.params.email
                };
            }
            account.update({ '_id': user['_id'] }, data, callback);
        }
    ], function (err, user) {
        if(err)
            res.send(500, err);
        else {
            if(req.params.newPassword == null) {
                res.send(200, 'Email updated!');
            }
            else {
                res.send(200, 'Password updated!');
            }
        }
    });
}

module.exports = {
    update: {
        general: updateGeneral,
        secure: updateSecure,
        image: updateImage
    }
}
