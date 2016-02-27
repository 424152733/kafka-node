var config = require('../../config/config');
var soap = require('soap');
var operation = require('retry').operation();
var loginRedis = require('../redis/login');
var loginFiscal = require('./login');
var cancel_pay_note = {unitNO: config.options.login.unitNO};

//监听cancel Topic
function listenCancel(value) {
    var jsonDate = JSON.parse(value);
    cancel_pay_note.pnNO = jsonDate.pnNO;
    cancel_pay_note.reason = jsonDate.reason;
    loginRedis.get(function(err, loginKey) {
        if(err) console.log(err);
        else{
            if(loginKey.value && loginKey.value != '') {
                cancel_pay_note.loginKey = loginKey.value;
                cancelPayNote(cancelPayNoteResult);
            }else{
                loginFiscal.reTryLogin(cancelPayNote, loginFiscal.loginAuth);
            }
        }
    });
}

//soap调用财政局webservice接口cancelPayNote
function cancelPayNote() {
    soap.createClient(config.url.main_url, function(err, client) {
        operation.attempt(function() {
            client.cancelPayNote({CancelPayNoteVO: cancel_pay_note}, function(err, result) {
                if(operation.retry(err)) {
                    return;
                }
                cancelPayNoteResult(err ? operation.mainError() : null, result);
            })
        })
    })
}

//根据接口返回的数据进行判断
function cancelPayNoteResult(err, result) {
    if(result.cancelPayNoteReturn.returnCode.$value == '100' || result.cancelPayNoteReturn.returnCode.$value == '213') {
        require('../../config/kafka').sendMessage([{topic: 'cancel.success', messages: '取消成功'}]);
    }else if(result.cancelPayNoteReturn.returnCode.$value == '202') {
        loginFiscal.reTryLogin(cancelPayNote, loginFiscal.loginAuth);
    }else{
        require('../../config/kafka').sendMessage([{topic: 'cancel.fail', messages: '创建失败'}]);
        console.log('创建缴款通知单失败:' + result.cancelPayNoteReturn.reason.$value);
    }
}

module.exports = {
    listenCancel: listenCancel
};