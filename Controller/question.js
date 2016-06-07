'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times
const fs = require('fs');               // filesystem; standard module
const request = require('request');     // Request; http client
const async = require('async');         // Async; manage chains of asynchronous tasks

// module dependencies
const authentication = require('./authentication.js');
const notifications = require('./notifications.js');
const validation = require('./validation.js');

// Models
const User = require('../Model/userSchema.js');
const Post = require('../Model/postSchema.js');
const Response = require('../Model/responseSchema.js');

// config
const config = require('../config.js');

// answer question
const answerQuestion = function answerQuestion(req, res, callback) {
    const required = ['token', 'postId', 'questionId', 'answer'];
    if(!validation.checkArgs(required, req, res)) return callback();

    let voterId = '';

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
                voterId = user['_id'];
                callback(null, user);
            }
        },
        function(user, callback) { // ensure user hasn't voted yet
            Response.findOne({
                '$and': [
                    { voterId: user['_id'] }, // specify voterId
                    { postId: req.params.postId }, // specify post
                    { promptIndex: req.params.questionId } // specify question
                ]
            }, callback);
        },
        function(response, callback) {
            if(response == null) {
                callback();
            }
            else {
                console.log('Vote denied; already voted.');
                res.send(401, 'already voted');
                return;
            }
        },
        function(callback) { // ensure post exists
            Post.findOne({
                '_id': req.params.postId
            }, callback);
        },
        function(post, callback) { // ensure user is not owner
            if(post == null) {
                console.log('Vote denied; post doesn\'t exist.');
                res.send(404, 'does not exist');
                return;
            }
            else {
                if(String(post.author) == String(voterId)) {
                    console.log('Vote denied; owner.');
                    res.send(401, 'owner');
                    return;
                }
                else {
                    callback();
                }
            }
        },
        function(callback) { // save
            if(typeof req.params.answer != 'boolean') { // ensure answer is boolean
                res.send(401, 'bad response')
                return;
            }

            let newResponse = new Response({
                postId: req.params.postId,
                promptIndex: req.params.questionId,
                voterId: voterId,
                response: req.params.answer
            });

            newResponse.save(callback);

            console.log('Voted!')
        },
        function(response, s, callback) { // find target post
            Post.findOne({ '_id': req.params.postId }, callback);
        },
        function(post, callback) { // find recipient
            User.findOne({ '_id': post.author }, callback);
        },
        function(user, callback) {
            notifications.new(req.params.postId, voterId, user['_id'], 'vote', callback);
        }
    ], function(err, response) {
        if(err)
            res.send(500, err);
        else {
            res.send({
                status: 'success',
                response: response
            });
        }
    });
}

// check if user can vote
const canVote = function canVote(req, res, callback) {
    const required = ['token', 'postId', 'questionId'];
    if(!validation.checkArgs(required, req, res)) return callback();

    let voterId = '';

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
                voterId = user['_id'];
                callback(null, user);
            }
        },
        function(user, callback) { // has user voted?
            Response.findOne({
                '$and': [
                    { voterId: user['_id'] }, // specify voterId
                    { postId: req.params.postId }, // specify post
                    { promptIndex: req.params.questionId } // specify question
                ]
            }, callback);
        },
        function(response, callback) {
            if(response == null) {
                callback();
            }
            else {
                res.send(200, { can: false, requested: req.params.questionId });
            }
        },
        function(callback) { // is user owner?
            Post.findOne({
                '_id': req.params.postId
            }, callback);
        },
        function(post, callback) {
            if(post == null) {
                res.send(200, { can: false });
            }
            else {
                if(String(post.author) == String(voterId)) {
                    res.send(200, { can: false, own: true, requested: req.params.questionId });
                }
                else {
                    res.send(200, { can: true, requested: req.params.questionId });
                }
            }
        },
    ], function(err) {
        if(err)
            res.send(500, err);
    });
}

// get results
const getResults = function getResults(req, res, callback) {
    const required = ['token', 'postId', 'questionId'];
    if(!validation.checkArgs(required, req, res)) return callback();

    let voterId = '';

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
                voterId = user['_id'];
                callback(null, user);
            }
        },
        function(user, callback) { // has user voted?
            Response.findOne({
                '$and': [
                    { voterId: user['_id'] }, // specify voterId
                    { postId: req.params.postId }, // specify post
                    { promptIndex: req.params.questionId } // specify question
                ]
            }, callback);
        },
        function(response, callback) {
            /*if(response == null) {
                res.send(401, 'must vote first');
            }
            else {
                callback();
            }*/
            callback();
        },
        function(callback) { // get results
            Response.find({
                '$and': [
                    { postId: req.params.postId }, // specify post
                    { promptIndex: req.params.questionId } // specify question
                ]
            }, callback);
        },
        function(responses, callback) {
            if(responses == null) {
                res.send(404, 'does not exist');
            }
            else {
                let voteYes = 0;
                let voteNo = 0;
                for(var i = 0; i < responses.length; i++) {
                    if(responses[i].response)
                        voteYes++;
                    else
                        voteNo++;
                }
                res.send(200, {
                    results: responses,
                    requested: req.params.questionId,
                    voteYes: voteYes,
                    voteNo: voteNo
                })
            }
        },
    ], function(err) {
        if(err)
            res.send(500, err);
    });
}

module.exports = {
    respond: answerQuestion,
    canVote: canVote,
    getResults: getResults
}
