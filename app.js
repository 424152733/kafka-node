#!/usr/bin/env node

/**
 * Module dependencies.
 */
var express = require('express');
var app = express();
var http = require('http');
var Consumer = require('./config/kafka').consumer();
var searchPayNote = require('./controller/fiscal/search-pay-note');
var createPayNote = require('./controller/fiscal/generate-pay-note');
var cancelPayNote = require('./controller/fiscal/cancel-pay-note');


/**
 * Get port from environment and store in Express.
 */

var port = '3000';
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);
require('./config/redis').getClient();


//监听kafka事件
Consumer.on('message', function(message) {
    if(message.topic == 'paynote.update') {
        searchPayNote.listenUpdate(message.value)
    }
    if(message.topic == 'paynote.create') {
        createPayNote.listenCreate(message.value)
    }
    if(message.topic == 'paynote.cancel') {
        cancelPayNote.listenCancel(message.value)
    }
});

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);

/**
 * Normalize a port into a number, string, or false.
 */
