'use strict'
// external dependencies
const restify = require('restify');     // restify; REST server framework
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times
require('mongoose-moment')(mongoose);   // Mongoose Moment; hook together mongoose and moment
const request = require('request');     // Request; http client
const async = require('async');         // Async; manage chains of asynchronous tasks
const fs = require('fs');               // filesystem; standard module
const jwt = require('jsonwebtoken');    // JSON web tokens; user authentication
const bcrypt = require('bcrypt-nodejs');// bcrypt; password hashing
const AWS = require('aws-sdk');         // Amazon Web Storage; for hosting on AWS

// bring in all Models in database
const Comment = require('./Model/commentSchema.js');    // Comments on posts
const Notification = require('./Model/notificationSchema.js');  // Notifications
const Post = require('./Model/postSchema.js');          // Post data
const Response = require('./Model/responseSchema.js');  // Votes on posts
const User = require('./Model/userSchema.js');          // User information

// bring in all Controllers
const account = require('./Controller/account.js');                 // creating accounts, modifying account information
const authentication = require('./Controller/authentication.js');   // logging in, registration, token validation
const comment = require('./Controller/comment.js');                 // commenting
const date = require('./Controller/date.js');                       // date formatting
const feed = require('./Controller/feed.js');                       // feed-related functions
const notifications = require('./Controller/notifications.js');     // notification functions
const post = require('./Controller/post.js');                       // creating posts
const profile = require('./Controller/profile.js');                 // updating profile and account information (name, image, password, etc)
const search = require('./Controller/search.js');                   // generating lists: search, feed, userpage
const question = require('./Controller/question.js');               // answering questions
const validation = require('./Controller/validation.js');           // input sanitization, parameters check

// bring in configuration file
const config = require('./config.js');

// db connection
mongoose.connection.on('open', function (ref) {
    console.log('Successfully connected to MongoDB Server!');
});
mongoose.connection.on('error', function (err) {
    console.log('Could not connect to MongoDB Server! Are you sure it\'s running?');
    console.log('Stopping Formal Wear server...');
    process.exit();
});
mongoose.connect(`mongodb://${config.db.username}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.database}`);

// start server; listen to POST requests
const server = restify.createServer(config.restify);

server.pre(function(req, res, callback) {
    console.log(req.connection.remoteAddress + ' requested ' + req.url);
    return callback();
})
server.pre(restify.CORS());

server.use(restify.fullResponse());
server.use(restify.bodyParser());

// routes - login
server.post('/auth/register/facebook', authentication.register.facebook);
server.post('/auth/login/facebook', authentication.login.facebook);
server.post('/auth/register/email', authentication.register.email);
server.post('/auth/login/email', authentication.login.email);
server.post('/auth/check', authentication.token.check);

// routes - profile
server.post('/profile/update/general', profile.update.general);
server.post('/profile/update/secure', profile.update.secure);
server.post('/profile/update/image', profile.update.image);

// routes - questions
server.post('/question/respond', question.respond);
server.post('/question/canVote', question.canVote);
server.post('/question/getResults', question.getResults);

// routes - get account details
server.post('/account/details', account.getInfoSecure.external);
server.post('/account/details/full', account.getInfoFull);

// etc - date humanization, notifications get
server.post('/date/humanize', date.humanize);
server.post('/notifications/get', notifications.get);

// routes - post management
server.post('/post/image', post.new.image);
server.post('/post/delete', post.deletePost);
server.post('/post/get', post.getInfo);

// routes - commenting
server.post('/comment/get', comment.getComments);
server.post('/comment/post', comment.postComment);
server.post('/comment/delete', comment.deleteComment);

// routes - feeds, following
server.post('/feed/follow', feed.follow);
server.post('/feed/unfollow', feed.unfollow);
server.post('/feed', feed.get);
server.post('/feed/user', feed.user);

// routes - search and explore
server.post('/explore', feed.explore);
server.post('/search', search.search);

// serve from filesystem
if(config.storage.useAWS == false) {
    server.get('/images/:image', restify.serveStatic({
        directory: config.root
    }));
}
// serve from s3
if(config.storage.useAWS == true) {
    const s3 = new AWS.S3(config.storage.aws);
    server.get('/images/:image', function(req, res) {
        request.get(config.storage.s3url + req.params.image).pipe(res);
    });
}

server.listen(config.restify.port, function() {
    console.log('%s listening at %s', server.name, server.url);
});
server.on('uncaughtException', function (req, res, route, err) {
    console.log('Uncaught Exception! ', err.stack);
});
