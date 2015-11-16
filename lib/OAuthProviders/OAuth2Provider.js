var OAuthProvider = require('../OAuthProvider.js'),
    url = require('url'),
    querystring = require('querystring'),
    OAuth2 = require('oauth').OAuth2;

var OAuth2Provider = function OAuth2Provider() {
    OAuthProvider.apply(this, arguments);
    this.config.publicKey = this.config.publicKey || this.config.clientId;
    this.config.privateKey = this.config.privateKey || this.config.clientSecret;

    var urlParts = url.parse(this.config.accessTokenUrl);
    var baseUrl = urlParts.protocol +
        (urlParts.slashes ? '//' : '') +
        (urlParts.auth ? (urlParts.auth + '@') : '') +
        urlParts.host;
    var accessTokenPath = urlParts.path;

    this.client = new OAuth2(
        this.config.publicKey,
        this.config.privateKey,
        baseUrl,
        null,
        accessTokenPath
    );
};
OAuth2Provider.prototype = Object.create(OAuthProvider.prototype);

OAuth2Provider.prototype.getVersion = function() { return '2.0'; };

OAuth2Provider.prototype.generateState = function() {
    return this.createHash([Date.now(), Math.random()]);
};

OAuth2Provider.prototype.getAuthorizationUrl = function(callback) {
    var urlParts = url.parse(this.config.authorizeUrl);

    var query = querystring.parse(urlParts.query);
    query.state = this.generateState();
    query.redirect_uri = this.config.callbackUrl;
    query.client_id = this.config.publicKey;

    urlParts.search = querystring.stringify(query);
    callback(null, url.format(urlParts));
};

OAuth2Provider.prototype.getAccessToken = function(credentials, callback) {
    if (credentials == null) return callback();
    var state = credentials.state;
    var code = credentials.code;
    var _this = this;

    if (!state) return callback(new Error('Invalid state supplied.'));
    if (!code) return callback(new Error('Invalid code supplied.'));

    var credentialsKey = this.createHash(state);

    this.storageProvider.retrieve(credentialsKey, function(err, record) {
        if (err) return callback(err);

        record = record || { };
        if (record.access_token && record.code == code) {
            return callback(null, {
                access_token: record.access_token,
                refresh_token: record.refresh_token
            });
        }

        _this.client.getOAuthAccessToken(
            code, { redirect_uri: _this.config.callbackUrl }, // This is for facebook api. Maybe we should pass it as a parameter?
            function(err, access_token, refresh_token) {
                if (err) return callback(err);

                record.code = code;
                record.access_token = access_token;
                record.refresh_token = refresh_token;

                _this.storageProvider.store(credentialsKey, record, function(err) {
                    if (err) return callback(err);

                    callback(null, {
                        access_token: record.access_token,
                        refresh_token: record.refresh_token
                    });
                });
            }
        );
    });
};

OAuth2Provider.prototype.storeAccessToken = function(credentails, accessToken, callback) {
    if (credentails == null) return callback();

    var state = credentials.state;
    var code = credentials.code;
    var _this = this;

    if (!state) return callback(new Error('Invalid state supplied.'));
    if (!code) return callback(new Error('Invalid code supplied.'));

    var credentialsKey = this.createHash(state);

    this.storageProvider.retrieve(credentialsKey, function(err, record) {
        if (err) return callback(err);

        record = record || { };
        record.access_token = accessToken.access_token;
        record.refresh_token = accessToken.refresh_token;

        _this.storageProvider.replace(credentialsKey, record, function(err) {
            if (err) return callback(err);

            callback();
        });
    });
};

module.exports = OAuth2Provider;