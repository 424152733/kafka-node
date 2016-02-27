var soap = require('soap');
var operation = require('retry').operation();
var config = require('../../config/config');
var loginRedis = require('../redis/login');
var loginFiscal = require('./login');
var search_pay_note = {unitNO: config.options.login.unitNO, status: 3, pageNo: 1};
var deserializedList = [];
var payNoteObjList = [];
var returnList = [];
var protoList = config.options.PayNoteVO;

//监听update Topic
function listenUpdate(value) {
    returnList = [];
    var jsonDate = JSON.parse(value);
    search_pay_note.createDTBegin = "20151229";
    search_pay_note.createDTEnd = jsonDate.endDate;
    loginRedis.get(function(err, loginKey) {
        if(err) console.log(err);
        else{
            if(loginKey.value && loginKey.value != '') {
                search_pay_note.loginKey = loginKey.value;
                searchPayNote();
            }else{
                loginFiscal.reTryLogin(searchPayNote, loginFiscal.loginAuth);
            }
        }
    });
}

function searchPayNote() {
    reTryReconciliation(search_pay_note.status, search_pay_note.pageNo);
}

//reTry 调取财政局webservice searchPayNote接口
function reTryReconciliation(status, pageNo) {
    search_pay_note.status = status;
    search_pay_note.pageNo = pageNo;
    soap.createClient(config.url.main_url, function(err, client) {
        operation.attempt(function() {
            client.searchPayNote({SearchPayNoteVO: search_pay_note}, function(err, result) {
                if(operation.retry(err)) {
                    return;
                }
                reconciliationResult(err ? operation.mainError() : null, result);
            })
        })
    })
}

//获取对账和缴费通知单数据
function reconciliationResult(err, result) {
    if(result.searchPayNoteReturn.returnCode.$value == '202') {
        loginFiscal.reTryLogin(searchPayNote, loginFiscal.loginAuth);
    }else if(result.searchPayNoteReturn.returnCode.$value == '100'){
        var payNote = result.searchPayNoteReturn.payNotes.$value;
        returnList = returnList.concat(payNote.split(']['));
        if(returnList.length == 1000) {
            reTryReconciliation(search_pay_note.status, search_pay_note.pageNo + 1)
        }else{
            for(var i = 0; i<returnList.length; i++) {
                var deserializedObj = {};
                payNoteObjList = returnList[i].split('|');
                for(var j = 0; j < payNoteObjList.length; j++) {
                    deserializedObj[protoList[j]] = payNoteObjList[j];
                }
                deserializedList.push(deserializedObj);
            }
            switch(search_pay_note.status) {
                case 3:
                    reTryReconciliation(2, 1);
                    break;
                case 2:
                    //将序列化后的数据用kafka事件发送
                    require('../../config/kafka').sendMessage([{topic: 'update.success', messages: 'success'}]);
            }
        }
    }else{
        switch(search_pay_note.status) {
            case 3:
                reTryReconciliation(2, 1);
                console.log('查询已对账通知单失败:' + result.searchPayNoteReturn.reason.$value);
                break;
            case 2:
                console.log('查询被缴款知单失败:' + result.searchPayNoteReturn.reason.$value);
                //将序列化后的数据用kafka事件发送
                require('../../config/kafka').sendMessage([{topic: 'update.success', messages: '查询成功'}]);
        }
    }
}

module.exports = {
    listenUpdate: listenUpdate
};
