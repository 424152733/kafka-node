var config = require('../../config/config');
var soap = require('soap');
var operation = require('retry').operation();
var loginRedis = require('../redis/login');
var loginFiscal = require('./login');
var generate_pay_note = {
        unitNO: config.options.login.unitNO,
        pnType: '1',
        chargeItemCount: 1,
        chargeItemNO1: '***********',
        price1: '*********',
        quantity1: '*********',
        totalAmt1: '**********'
    };

//监听create Topic
function listenCreate(value) {
    var jsonDate = JSON.parse(value);
    generate_pay_note.receivableAmt = jsonDate.Amount;
    generate_pay_note.payerName = jsonDate.payer;
    generate_pay_note.pnNO = jsonDate.noticeNumber;
    generate_pay_note.createDT = jsonDate.createDT;
    generate_pay_note.remark = jsonDate.remark;
    loginRedis.get(function(err, loginKey) {
        if(err) console.log(err);
        else{
            if(loginKey.value && loginKey.value != '') {
                generate_pay_note.loginKey = loginKey.value;
                generatePayNote(generatePayNoteResult);
            }else{
                loginFiscal.reTryLogin(generatePayNote, loginFiscal.loginAuth);
            }
        }
    });
}

//soap调用财政局webservice接口
function generatePayNote() {
    soap.createClient(config.url.main_url, function(err, client) {
        operation.attempt(function() {
            client.generatePayNote({GeneratePayNoteVO: generate_pay_note}, function(err, result) {
                if(operation.retry(err)) {
                    return;
                }
                generatePayNoteResult(err ? operation.mainError() : null, result);
            })
        })
    })
}

//根据接口返回的数据进行判断
function generatePayNoteResult(err, result) {
    var reasonStr = '发出缴款通知书失败原因:通知书号码已经存在';
    var formatStr = result.generatePayNoteReturn.reason.$value.replace(/\s/g, "");
    if(result.generatePayNoteReturn.returnCode.$value == '100' || formatStr == reasonStr) {
        require('../../config/kafka').sendMessage([{topic: 'create.success', messages: '创建成功'}]);
    }else if(result.generatePayNoteReturn.returnCode.$value == '202') {
        loginFiscal.reTryLogin(generatePayNote, loginFiscal.loginAuth);
    }else{
        require('../../config/kafka').sendMessage([{topic: 'create.fail', messages: '创建失败'}]);
        console.log('创建缴款通知单失败:' + result.generatePayNoteReturn.reason.$value);
    }

}

module.exports = {
    listenCreate: listenCreate
};