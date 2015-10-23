var OAuthProvider = require('../OAuthProvider.js'),
    url = require('url'),
    querystring = require('querystring'),
    OAuth = require('oauth').OAuth;

var OAuth1Provider = function OAuth1Provider() {
    OAuthProvider.apply(this, arguments);

    this.config.publicKey = this.config.publicKey || this.config.consumerKey;
    this.config.privateKey = this.config.privateKey || this.config.consumerSecret;

    this.client = new OAuth(
        this.config.requestTokenUrl,
        this.config.accessTokenUrl,
        this.config.publicKey,
        this.config.privateKey,
        '1.0',
        this.config.callbackUrl,
        this.config.signatureAlgorithm || 'HMAC-SHA1'
    );
};
OAuth1Provider.prototype = Object.create(OAuthProvider.prototype);

OAuth1Provider.prototype.getVersion = function() { return '1.0'; };

OAuth1Provider.prototype.getAuthorizationUrl = function(callback) {
    var _this = this;
    this.client.getOAuthRequestToken(function(err, oauth_token, oauth_token_secret) {
        if (err) return callback(err);

        var credentialsKey = _this.createHash(oauth_token);
        _this.storageProvider.store(credentialsKey, {
            oauth_token: oauth_token,
            oauth_token_secret: oauth_token_secret
        }, function(err) {
            if (err) return callback(err);

            var urlParts = url.parse(_this.config.authorizeUrl);

            var query = querystring.parse(urlParts.query);
            query.oauth_token = oauth_token;

            urlParts.search = querystring.stringify(query);
            callback(null, url.format(urlParts));
        });
    });
};

OAuth1Provider.prototype.getAccessToken = function(credentials, callback) {
    if (credentials == null) return callback();
    var oauth_token = credentials.oauth_token;
    var oauth_verifier = credentials.oauth_verifier;
    var _this = this;

    if (!oauth_token) return callback(new Error('Invalid oauth_token supplied.'));
    if (!oauth_verifier) return callback(new Error('Invalid oauth_verifier supplied.'));

    var credentialsKey = this.createHash(oauth_token);
    this.storageProvider.retrieve(credentialsKey, function(err, record) {
        if (err) return callback(err);

        if (!record) return callback(new Error('Invalid oauth_token supplied.'));

        if (record.oauth_access_token && record.oauth_verifier == oauth_verifier) {
            return callback(null, {
                oauth_access_token: record.oauth_access_token,
                oauth_access_token_secret: record.oauth_access_token_secret
            });
        }

        _this.client.getOAuthAccessToken(
            oauth_token, record.oauth_token_secret, oauth_verifier,
            function(err, oauth_access_token, oauth_access_token_secret) {
                if (err) return callback(err);

                record.oauth_access_token = oauth_access_token;
                record.oauth_access_token_secret = oauth_access_token_secret;
                record.oauth_verifier = oauth_verifier;

                _this.storageProvider.store(credentialsKey, record, function(err) {
                    if (err) return callback(err);

                    callback(null, {
                        oauth_access_token: record.oauth_access_token,
                        oauth_access_token_secret: record.oauth_access_token_secret
                    });
                });
            }
        );
    });
};

OAuth1Provider.prototype.storeAccessToken = function(credentails, accessToken, callback) {
    if (credentails == null) return callback();

    var oauth_token = credentials.oauth_token;
    var oauth_verifier = credentials.oauth_verifier;
    var _this = this;

    if (!oauth_token) return callback(new Error('Invalid oauth_token supplied.'));
    if (!oauth_verifier) return callback(new Error('Invalid oauth_verifier supplied.'));

    var credentialsKey = this.createHash(oauth_token);

    this.storageProvider.retrieve(credentialsKey, function(err, record) {
        if (err) return callback(err);

        record = record || { };
        record.oauth_access_token = accessToken.oauth_access_token;
        record.oauth_access_token_secret = accessToken.oauth_access_token_secret;

        _this.storageProvider.replace(credentialsKey, record, function(err) {
            if (err) return callback(err);

            callback();
        });
    });
};

module.exports = OAuth1Provider;