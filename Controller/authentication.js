'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times
const jwt = require('jsonwebtoken');    // JSON web tokens; user authentication
const request = require('request');     // Request; http client
const async = require('async');         // Async; manage chains of asynchronous tasks
const bcrypt = require('bcrypt-nodejs');// bcrypt; password hashing

// module dependencies
const account = require('./account.js');
const authentication = require('./authentication.js');
const validation = require('./validation.js');

// Models
const User = require('../Model/userSchema.js');

// secret key
const jwtSecretKey = 'o0bJ/bz<}44=E90;672)#DkarQ^jUc'; // TODO: regenerate for judges

// check token
const checkToken = function(req, res, callback) {
    const required = ['token'];
    if(!validation.checkArgs(required, req, res)) return callback();
    getUserByToken(req.params.token, function(err, user) {
        if(err) res.send(500, err);
        else {
            if(user == null) res.send(401, false);
            else res.send(200, true);
        }
    })
}

// get user by token
const getUserByToken = function(token, callback) {
    async.waterfall([
        function(callback) {
            User.findOne({ jwt: token }, callback);
        }
    ], function(err, user) {
        callback(err, user);
    })
}

// generate jwt
const generateJWT = function(query, returnUser, callback) {
    async.waterfall([
        function(callback) { // create token
            let payload = {
                user: query.dbUserId || query.email
            };
            let options = {
                algorithm: 'HS256',
                expiresIn: '365 days',
                issuer: 'Formal Wear'
            };
            let token = jwt.sign(payload, jwtSecretKey, options);

            callback(null, token);
        },
        function(token, callback) { // save token
            account.update(query, { jwt: token }, callback);
        }
    ], function(err, user) {
        if(returnUser)
            callback(err, user);
        else
            callback(err, user.jwt);
    });
}

// register via facebook
const fbRegistration = function fbRegistration(req, res, callback) {
    const required = ['fbUserId', 'fbAccessToken', 'fbTokenExpiry'];
    if(!validation.checkArgs(required, req, res)) return callback();

    async.waterfall([
        function(callback) { // check if user exists
            User.findOne({ fbUserId: req.params.fbUserId }, callback);
        },
        function(user, callback) {
            let exists = false;
            if(user == null)
                exists = false;
            else
                exists = user['_id'];

            let graphApiUrl = 'https://graph.facebook.com/' + req.params.fbUserId + '?fields=first_name,last_name,picture&access_token=' + req.params.fbAccessToken;
            request(graphApiUrl, function(err, response, body) { callback(err, exists, response, body) });
        },
        function(exists, response, body, callback) { // parse facebook data
            if(response.statusCode == 200) {
                let userData = JSON.parse(body);
                callback(null, exists, userData);
            }
            else {
                /*
                    This most likely happened because the provided Facebook User ID didn't match up with the Facebook Access Token.
                    If Facebook declines the request with an error, it means authentication didn't pass.
                    User ID and Access Token must match in order to ensure the user is actually the user, and we have the right to act upon their account.
                */
                console.log('A user failed Facebook login!');
                res.send(response.statusCode, JSON.parse(response.body));
                return;
            }
        },
        function(exists, userData, callback) { // create new account with data from facebook
            if (exists) { // account already exists; just update
                account.update({ '_id': exists }, {
                    fbAccessToken: req.params.fbAccessToken,
                    fbTokenExpiry: moment().add(req.params.fbTokenExpiry).unix()
                }, function(err, user) {
                    callback(err);
                });
            }
            else {
                let data = {
                    name: {
                        first: userData.first_name,
                        last: userData.last_name
                    },
                    imageUrl: userData.picture.data.url,
                    fbUserId: req.params.fbUserId,
                    fbAccessToken: req.params.fbAccessToken,
                    fbTokenExpiry: moment().add(req.params.fbTokenExpiry).unix()
                };

                account.create(data, callback);
            }
        },
        function(callback) { // generate token
            generateJWT({ fbUserId: req.params.fbUserId }, true, callback);
        }
    ], function(err, user) {
        if(err)
            res.send(500, err);
        else {
            console.log(user.name.first + ' logged in via Facebook');
            res.send({
                status: 'success',
                user: user
            });
        }
    });
}

// login via email
const fbLogin = fbRegistration;

// register via email
const emailRegistration = function emailRegistration(req, res, callback) {
    const required = ['firstName', 'lastName', 'email', 'password'];
    if(!validation.checkArgs(required, req, res)) return callback();

    async.waterfall([
        function(callback) { // check if user exists
            User.findOne({ emailAddress: req.params.email }, callback);
        },
        function(user, callback) {
            if(user == null)
                callback(null);
            else
                res.send(409, 'already exists');
        },
        function(callback) { // hash password
            bcrypt.hash(req.params.password, null, null, callback);
        },
        function(hash, callback) { // create new account
            let data = {
                name: {
                    first: req.params.firstName,
                    last: req.params.lastName
                },
                emailAddress: req.params.email,
                passwordHash: hash
            };

            account.create(data, callback);
        },
        function(user, arg, callback) { // generate token
            generateJWT({ emailAddress: req.params.email }, true, callback);
        }
    ], function(err, user) {
        if(err)
            res.send(500, err);
        else {
            console.log(user.name.first + ' registered via email');
            res.send({
                status: 'success',
                user: user
            });
        }
    });
}

// login via email
const emailLogin = function emailLogin(req, res, callback) {
    const required = ['email', 'password'];
    if(!validation.checkArgs(required, req, res)) return callback();

    async.waterfall([
        function(callback) { // check if user exists
            User.findOne({ emailAddress: req.params.email }, callback);
        },
        function(user, callback) {
            if(user == null)
                res.send(404, 'does not exist');
            else
                callback(null, user);
        },
        function(user, callback) { // compare hash
            bcrypt.compare(req.params.password, user.passwordHash, callback);
        },
        function(result, callback) { // check hash
            if(result) // password match
                callback();
            else // no
                res.send(401, 'bad password');
        },
        function(callback) { // generate token
            generateJWT({ emailAddress: req.params.email }, true, callback);
        }
    ], function(err, user) {
        if(err)
            res.send(500, err);
        else {
            console.log(user.name.first + ' logged in via email');
            res.send({
                status: 'success',
                user: user
            });
        }
    });
}

module.exports = {
    register: {
        facebook: fbRegistration,
        email: emailRegistration
    },
    login: {
        facebook: fbLogin,
        email: emailLogin
    },
    token: {
        check: checkToken,
        getUser: getUserByToken
    }
}
