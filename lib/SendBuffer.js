var EventEmitter = require('events').EventEmitter;

var SendBuffer = function SendBuffer() {
    EventEmitter.apply(this, arguments);
    this.queue = [];
    this.timeout = null;
    this.timestamp = Infinity;
};
SendBuffer.prototype = Object.create(EventEmitter.prototype);

SendBuffer.prototype.add = function(packet, delay) {
    delay = delay || 30 * 1000;
    this.queue.push(packet);

    var now = Date.now(), _this = this;
    if (now + delay < this.timestamp) {
        this.timestamp = now + delay;
        clearTimeout(this.timeout);
        this.timestamp = setTimeout(function() {
            _this.flush();
        }, delay);
    }
};

SendBuffer.prototype.flush = function() {
    var packets = this.queue;
    this.queue = [];
    this.timestamp = Infinity;
    if (packets.length) {
        this.emit('flush', packets);
    }
};

module.exports = SendBuffer;