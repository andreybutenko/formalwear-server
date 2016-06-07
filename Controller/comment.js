'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times
const fs = require('fs');               // filesystem; standard module
const request = require('request');     // Request; http client
const async = require('async');         // Async; manage chains of asynchronous tasks

// module dependencies
const account = require('./account.js');
const authentication = require('./authentication.js');
const notifications = require('./notifications.js');
const validation = require('./validation.js');

// Models
const Post = require('../Model/postSchema.js');
const Comment = require('../Model/commentSchema.js');
const User = require('../Model/userSchema.js');

// config
const config = require('../config.js');

// post comment
const postComment = function postComment(req, res, callback) {
    const required = ['token', 'postId', 'comment'];
    if(!validation.checkArgs(required, req, res)) return callback();

    let sourceId;
    let targetPost;

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
        function(user, callback) { // ensure post exists
            sourceId = user['_id'];
            Post.findOne({ '_id': req.params.postId },
                function(err, post) {
                    callback(err, user, post);
                }
            );
        },
        function(user, post, callback) { // save
            if(post == null)
                return res.send(401, 'post doesn\'t exist');
            else {
                targetPost = post;
                let newComment = new Comment({
                    postId: req.params.postId,
                    commenterId: user['_id'],
                    comment: validation.sanitizeText(req.params.comment),
                    published: new moment().unix()
                });

                newComment.save(callback);
                console.log(user.name.first + ' commented!');
            }
        },
        function(comment, s, callback) { // find recipient
            User.findOne({ '_id': targetPost.author }, callback);
        },
        function(user, callback) {
            notifications.new(req.params.postId, sourceId, user['_id'], 'comment', callback);
        }
    ], function(err, response) {
        if(err)
            res.send(500, err);
        else {
            res.send({
                status: 'success'
            });
        }
    });
}

// get comments
const getComments = function getComments(req, res, callback) {
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
        function(user, callback) { // get comments
            Comment.find({
                postId: req.params.postId
            }, callback);
        }
    ], function(err, comments) {
        if(err)
            res.send(500, err);
        else {
            res.send(200, comments);
        }
    });
}

// delete comment
const deleteComment = function deleteComment(req, res, callback) {
    const required = ['token', 'commentId'];
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
        function(user, callback) { // check that user owns commetn
            Comment.findOne({
                '_id': req.params.commentId
            }, function(err, comment) {
                if(String(comment.commenterId) == String(user.id)) {
                    callback(err, comment);
                }
                else {
                    callback('Not your post');
                }
            });
        },
        function(comment, callback) {
            Comment.findOneAndRemove({
                '_id': req.params.commentId
            }, callback);
        }
    ], function(err, comment) {
        if(err)
            res.send(500, err);
        else {
            res.send(200, 'ok');
        }
    });
}

module.exports = {
    getComments: getComments,
    postComment: postComment,
    deleteComment: deleteComment
}
