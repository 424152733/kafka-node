var crypto = require('crypto');
var Iconv = require('iconv-lite');

//加密
function cipher(algorithm, buf, key) {
    var encrypted = '';
    var cip = crypto.createCipher(algorithm, key);
    encrypted += cip.update(buf, 'utf8', 'base64');
    encrypted += cip.final('base64');
    console.log(encrypted)
}

//解密
function decipher(algorithm, encrypted, key) {
    var decrypted = "";
    var decipher = crypto.createDecipher(algorithm, key);
    decrypted += decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    console.log(decrypted)
}


