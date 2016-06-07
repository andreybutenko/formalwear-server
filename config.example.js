'use strict'
let config = {};

// root directory
config.root = '/placeholder/directory';

// db connection
config.db = {
    username: 'username',
    password: 'password',
    host: 'localhost',
    port: 27017,
    database: 'dbname'
};

// restify config
config.restify = {
    name: 'Formal Wear server',
    port: 8080
};

// storage config
config.storage = {
    useAWS: true,
    s3url: 'http://bucket-url.s3-region.amazonaws.com/',
    aws: {
        params: {
            Bucket: 'bucket.name'
        },
        region: 's3-region',
        accessKeyId: 'id',
        secretAccessKey: 'key'
    }
}

module.exports = config;
