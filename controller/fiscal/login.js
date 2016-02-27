var soap = require('soap'),
    Login = require('../redis/login'),
    operation = require('retry').operation(),
    config = require('../../config/config'),
    loginKey = {};

//reTry 调取财政局webservice login接口
function reTryLogin(fn, cb) {
    soap.createClient(config.url.main_url, function(err, client) {
        if(err) console.log(err);
        else{
            operation.attempt(function() {
                client.login({loginvo: config.options.login}, function(err, result) {
                    if(operation.retry(err)) {
                        return;
                    }
                    cb(err ? operation.mainError() : null, fn, result);
                })
            });
        }
    });
}

//根据返回值进行判断操作
function loginAuth(err, fn, result) {
    if(result.loginReturn.returnCode.$value == '100'){
        loginKey.value = result.loginReturn.loginKey.$value;
        Login.save(loginKey, function(err) {
            if(err) console.log(err);
            else {
                console.log('保存成功!');
                fn();
            }
        });
    }
    if(result.loginReturn.returnCode.$value == '201'){
        console.log('验证失败')
    }
    if(result.loginReturn.returnCode.$value == '299'){
        console.log('系统错误')
    }
}

module.exports = {
    reTryLogin: reTryLogin,
    loginAuth: loginAuth
};


