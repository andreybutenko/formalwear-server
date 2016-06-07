'use strict'
// external dependencies
const mongoose = require('mongoose');   // mongoose; 'Model' in MVC
const moment = require('moment');       // Moment.js; parsing, manipulation, and display of dates and times
const async = require('async');         // Async; manage chains of asynchronous tasks

// module dependencies
const authentication = require('./authentication.js');
const validation = require('./validation.js');

// Models
const Notification = require('../Model/notificationSchema.js');

// create notification
const newNotification = function newNotification(location, source, recipient, type, callback) {
    let newNotification = new Notification({
        location: location,
        source: source,
        recipient: recipient,
        type: type,
        seen: false,
        time: new moment().unix()
    });

    newNotification.save(callback);
}

// get notifications
const getNotifications = function getNotifications(req, res, callback) {
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
        function(user, callback) { // get notifications
            Notification.find({ recipient: user['_id'] }, function(err, notifications) {
                callback(err, user, notifications);
            });
        },
        function(user, notifications, callback) { // update
            Notification.update({ recipient: user['_id'] }, { seen: true }, function(err) {
                callback(err, notifications);
            });
        }], function(err, notifications) {
            if(err)
                res.send(500, err);
            else {
                res.send(200, notifications);
            }
        }
    );
}

module.exports = {
    new: newNotification,
    get: getNotifications
}
