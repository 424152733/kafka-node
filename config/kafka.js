
var kafka = require('kafka-node');
var Producer = kafka.Producer;
var Consumer = kafka.Consumer;
var client = new kafka.Client();
var producer = new Producer(client);

module.exports = {
    sendMessage: function(payloads) {
        producer.send(payloads, function(err, data) {
            if(err) console.log(err);
            console.log(data)
        })
    },
    consumer: function() {
        return new Consumer(
            client,
            [
                {topic: 'paynote.create', partition: 0},
                {topic: 'paynote.update', partition: 0},
                {topic: 'paynote.cancel', partition: 0}
            ],
            {
                autoCommit: false
            })
    }
};

