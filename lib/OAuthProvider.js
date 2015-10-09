var OAuthProvider = function(storageProvider, config) {
    this.config = config;
    this.storageProvider = storageProvider;
};

OAuthProvider.prototype.getProtocolName = function() {
    return 'OAuth';
};

OAuthProvider.prototype.getVersion = function() {
    throw new Error('Not implemented.');
};

OAuthProvider.prototype.createHash = function(object) {
    var hmac = require('crypto').createHmac('sha1', this.config.privateKey);
    hmac.update(JSON.stringify(object));
    return hmac.digest('hex');
};

OAuthProvider.prototype.getAuthorizationUrl = function(callback) {
    callback(new Error('Not implemented.'));
};

OAuthProvider.prototype.getAccessToken = function(callback) {
    callback(new Error('Not implemented.'));
};

OAuthProvider.create = function (storageProvider, authConfig) {
    if (['1.0', '1.0a', '2.0'].indexOf(authConfig.version) < 0) {
        throw new Error('Unsupported protocol version.');
    }

    if (authConfig.version == '2.0') {
        return new (require('./OAuthProviders/OAuth2Provider.js'))(storageProvider, authConfig.config);
    } else {
        return new (require('./OAuthProviders/OAuth1Provider.js'))(storageProvider, authConfig.config);
    }
};

module.exports = OAuthProvider;