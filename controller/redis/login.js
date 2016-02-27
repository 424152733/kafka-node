
var config = require('../../config/config');
//保存loginKey
exports.save = function(loginKey, fn) {
    redis.hmset('loginKey:' + config.options.login.unitNO + ':data', loginKey, function(err) {
        if(err) return fn(err);
        fn(null);
    })
};

//获取loginKey
exports.get = function(fn) {
    redis.hgetall('loginKey:' + config.options.login.unitNO + ':data', function(err, obj) {
        if(err) return fn(err);
        fn(null, obj);
    })
};

//刪除loginKey
exports.remove = function(fn) {
    redis.del('loginKey:' + config.options.login.unitNO + ':data', function(err, obj) {
        if(err) return fn(err);
        fn(null, obj);
    })
};
