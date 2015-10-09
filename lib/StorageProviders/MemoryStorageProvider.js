var StorageProvider = require('../StorageProvider.js');

var MemoryStorageProvider = function MemoryStorageProvider() {
    StorageProvider.apply(this, arguments);

    this.storage = {};
    this.storageCount = {};
};

MemoryStorageProvider.prototype = Object.create(StorageProvider.prototype);

MemoryStorageProvider.prototype.store = function(key, value, callback) {
    this.storage[key] = value;
    this.storageCount[key] = (this.storageCount[key] || 0) + 1;
    callback && callback();
};

MemoryStorageProvider.prototype.retrieve = function(key, callback) {
    callback && callback(null, this.storage[key]);
};

MemoryStorageProvider.prototype.retrieveAll = function(callback) {
    callback && callback(this.storage);
};

MemoryStorageProvider.prototype.removeAll = function(callback) {
    this.storage = {};
    this.storageCount = {};
    callback && callback();
};

MemoryStorageProvider.prototype.remove = function(key, callback) {
    this.storageCount[key] = (this.storageCount[key] || 1) - 1;
    if (this.storageCount[key] < 1) {
        delete this.storage[key];
        delete this.storageCount[key];
    }
    callback && callback();
};

module.exports = MemoryStorageProvider;