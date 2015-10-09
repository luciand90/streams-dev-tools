var StorageProvider = function StorageProvider(config) {
    this.config = config;
};

StorageProvider.prototype.store = function(key, value, callback) {
    callback && callback(new Error('Not implemented.'));
};

StorageProvider.prototype.retrieve = function(key, callback) {
    callback && callback(new Error('Not implemented.'));
};

StorageProvider.prototype.retrieveAll = function(callback) {
    callback && callback(new Error('Not implemented.'));
};

StorageProvider.prototype.removeAll = function(callback) {
    callback && callback(new Error('Not implemented.'));
};

StorageProvider.prototype.remove = function(key, callback) {
    callback && callback(new Error('Not implemented.'));
};

module.exports = StorageProvider;