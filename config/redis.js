var redis = require('redis');

exports.getClient =function(){
    global.redis = redis.createClient();

    global.redis.on("error", function(err) {
        console.log("Error" + err);
    });
    global.redis.on('connect', function() {
        console.log('redis is connected!');
    });
};