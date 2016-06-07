'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times
const fs = require('fs');               // filesystem; standard module
const request = require('request');     // Request; http client
const async = require('async');         // Async; manage chains of asynchronous tasks
const AWS = require('aws-sdk');         // Amazon Web Storage; for hosting on AWS

// module dependencies
const authentication = require('./authentication.js');
const validation = require('./validation.js');

// Models
const Post = require('../Model/postSchema.js');

// config
const config = require('../config.js');

// generate unique url
const genUrl = function genUrl() {
    return (+new Date()).toString(36);
    // get current time in small units and return id based on it
}

// delete post
const deletePost = function deletePost(req, res, callback) {
    const required = ['token', 'postId'];
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
        function(user, callback) { // get post
            Post.findOne({ '_id': req.params.postId }, function(err, post) {
                if(err)
                    callback(err);
                else
                    callback(err, user, post)
            });
        },
        function(user, post, callback) { // verify user is owner then delete
            if(String(post.author) == String(user['_id'])) {
                Post.findOneAndRemove({ '_id': req.params.postId }, function(err) {
                    console.log(user.name.first + ' deleted their post.');
                    callback(err);
                });
            }
            else {
                console.log(user.name.first + ' failed to delete a post.')
                callback('notOwner');
            }
        }
    ], function(err) {
        if(!err) {
            res.send(200, 'ok');
        }
        else if(err == 'notOwner') {
            res.send(400, {
                status: 'failed',
                err: 'not your post'
            });
        }
        else {
            res.send(500, err);
        }
    });
}

// get post info
const getInfo = function getInfo(req, res, callback) {
    const required = ['token', 'postId'];
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
        function(user, callback) { // get post
            Post.findOne({ '_id': req.params.postId }, function(err, post) {
                if(err)
                    callback(err);
                else
                    callback(err, post);
            });
        }
    ], function(err, post) {
        if(!err) {
            res.send(200, post);
        }
        else {
            res.send(500, err);
        }
    });
}

// create new post
const newPost = function newPost(req, res, callback) {
    const required = ['token', 'imageData', 'description', 'prompts', 'discovery'];
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
        function(user, callback) { // validate prompts
            var prompts = req.params.prompts;
            var err = {
                status: 'failed',
                err: 'bad prompts'
            };

            if(!Array.isArray(prompts)) { // prompts must be in array
                res.send(401, err);
                console.log('Denied bad prompt array; not in array!');
                return;
            }

            for(var i = 0; i < prompts.length; i++) { // array must be made up of only Strings
                if(typeof prompts[i] != 'string') {
                    res.send(401, err);
                    console.log('Denied bad prompt array; contents not string!');
                    return;
                }
            }

            callback(null, user, prompts);
        },
        function(user, prompts, callback) { // save image
            let fileName = genUrl();
            let uri = config.root + 'images/' + fileName + '.png';
            // save to filesystem
            fs.writeFile(uri, req.params.imageData, { encoding: 'base64', flag: 'w+' }, function(err) {
                callback(err, user, fileName, prompts);
            });
        },
        function(user, fileName, prompts, callback) { // if using s3, upload
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
                        callback(err, user, fileName, prompts);
                    })
                });
            }
        },
        function(user, fileName, prompts, callback) { // save new post to database
            if(typeof req.params.discovery != "boolean") req.params.discovery = true;
            let data = {
                author: user,
                description: validation.sanitizeText(req.params.description),
                imageUri: '/images/' + fileName + '.png',
                prompts: prompts,
                privacy: {
                    discovery: req.params.discovery
                },
                published: new moment().unix()
            }

            let newPost = new Post(data);
            newPost.save(function(err) {
                callback(err, fileName);
            });
            console.log(user.name.first + ' created a new post!');
            console.log('here')
            console.log(prompts.length);
            console.log(prompts);
        },
        function(fileName, callback) { // get new post data to send back
            Post.findOne({ imageUri: '/images/' + fileName + '.png'}, callback);
        }
    ], function(err, postObj) {
        if(err)
            res.send(500, err);
        else {
            res.send({
                status: 'success',
                post: postObj
            });
        }
    });
}

module.exports = {
    new: {
        image: newPost
    },
    deletePost: deletePost,
    getInfo: getInfo,
    genUrl: genUrl
}
