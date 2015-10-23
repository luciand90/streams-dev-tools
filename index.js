var express = require('express'),
    bodyParser = require('body-parser'),
    expressValidator = require('express-validator'),
    request = require('request'),
    mysql = require('mysql'),
    util = require('util'),
    OAuthProvider = require('./lib/OAuthProvider.js'),
    Promise = require("node-promise").Promise,
    SendBuffer = require('./lib/SendBuffer.js'),
    pushURL = 'http://52.16.43.57:8080/VectorCloud/rest/v1/stream/push',
    privateMethods;

function log(type, text, force) {
    if (force) {
        console[type](util.inspect(text, {colors: true, depth: null}));
    }
}

function establishDBConnection(dbSettings) {
    if (dbSettings.connection) return dbSettings.connection;

    return mysql.createConnection(dbSettings);
}


var VectorWatchStreamNode = function VectorWatchStreamNode(options) {
    if (typeof options != "object" && Object.prototype.toString.call(options) == '[object Array]') {
        throw new Error('options have to be an object.');
    }
    this.options = options;
    this.debugMode = false;
    var _this = this;

    if (!options.token) {
        throw new Error('token is required.');
    }
    this.token = options.token;

    if (!options.streamUID) {
        throw new Error('streamUID is required.');
    }
    this.streamUID = options.streamUID;

    if (options.database) {
        var connection = establishDBConnection(options.database);

        var MysqlStorageProvider = require('./lib/StorageProviders/MysqlStorageProvider.js');
        this.authStorage = new MysqlStorageProvider({
            connection: connection,
            table: options.database.authStorageTable || 'Auth'
        });
        this.stateStorage = new MysqlStorageProvider({
            connection: connection,
            table: options.database.stateStorageTable || 'Settings'
        });
    } else {
        var MemoryStorageProvider = require('./lib/StorageProviders/MemoryStorageProvider.js');
        this.authStorage = new MemoryStorageProvider();
        this.stateStorage = new MemoryStorageProvider();
    }

    if (options.auth) {
        var auth = options.auth;
        if (auth.protocol.toLowerCase() != 'oauth') {
            throw new Error('Unsupported auth protocol.');
        }
        this.oauthClient = OAuthProvider.create(this.authStorage, auth);
    }

    this.sendBuffer = new SendBuffer();
    this.sendBuffer.on('flush', function(packets) {
        log('log', "The data is sent to VectorCloud.", true);
        log('log', requestBody, _this.debugMode);
        var options = {
            uri: pushURL,
            method: 'POST',
            json: packets,
            headers: {"Authorization": _this.token}
        };
        request(options, function (err, response, body) {
            if (!err && response.statusCode == 200) {
                log('log', body, _this.debugMode);
            } else {
                log('log', err, _this.debugMode);
            }
        });
    });

    privateMethods.setupRouter.call(this);
};

/** This function is called every time a user adds the stream to a watch face(and selects the desired settings, if needed).
 * The DB(if the stream has settings that need to be stored) is automatically updated.
 * When implementing this method the developer must call the 'resolve' function parameter after he retrives/generates the data.
 *      resolve({data:"..."});
 * Called for public streams
 * @param resolve {Function} DB insert success callback
 * @param reject {Function} DB insert fail callback
 * @param settings {Object} User settings
 * @param authTokens {Object}
 * @returns {null}
 * */
VectorWatchStreamNode.prototype.registerSettings = function (resolve, reject, settings, authTokens) {
    reject && reject(new Error('Not implemented.'));
};

/** This function is called every time a user removes the stream from a watch face.
 Called for public streams
 * @param settings {Object} User settings
 * @param authTokens {Object}
 * @returns {null}
 * */
VectorWatchStreamNode.prototype.unregisterSettings = function (settings, authTokens) { };

/**
 * @param resolve {Function}
 * @param reject {Function}
 * @param authTokens {Object}
 */
VectorWatchStreamNode.prototype.requestConfig = function(resolve, reject, authTokens) {
    reject && reject(new Error('Not implemented.'));
};

/**
 * @param resolve {Function}
 * @param reject {Function}
 * @param settingName {String}
 * @param searchTerm {String}
 * @param state {Object}
 * @param authTokens {Object}
 */
VectorWatchStreamNode.prototype.requestOptions = function(resolve, reject, settingName, searchTerm, state, authTokens) {
    reject && reject(new Error('Not implemented.'));
};

/**
 * @param state {Object}
 * @param data {String}
 * @param delayInMinutes {Number}
 * @returns {VectorWatchStreamNode}
 */
VectorWatchStreamNode.prototype.push = function(state, data, delayInMinutes) {
    delayInMinutes = delayInMinutes || 5;
    this.sendBuffer.add({
        type: 3,
        streamUUID: this.streamUID,
        channelLabel: state.channelLabel,
        d: data
    }, delayInMinutes * 60 * 1000);
    return this;
};

/**
 * @returns {VectorWatchStreamNode}
 */
VectorWatchStreamNode.prototype.pushNow = function() {
    this.sendBuffer.flush();
    return this;
};

/**
 * @param state {Object}
 * @returns {VectorWatchStreamNode}
 */
VectorWatchStreamNode.prototype.authTokensForStateExpired = function(state) {
    this.sendBuffer.add({
        type: 5,
        streamUUID: this.streamUID,
        channelLabel: state.channelLabel
    }, 0);
    return this;
};

/** Get all the settings stored in the DB. On success the resolve(settingsArray) method is called, otherwise the reject(error) method.
 * The developer can access the returned array in the resolve(settingsArray) callback, as a parameter.
 Example: sample_stream.retrieveSettings(function (settingsArray) {
                console.log(settingsArray); -> [{"City":"Bucharest", ...},{"City":"New York", ...}, ...]
            });
 * @param resolve {Function} DB select success callback
 * @param reject {Function} DB select fail callback
 * @returns null
 *
 **/
VectorWatchStreamNode.prototype.retrieveSettings = VectorWatchStreamNode.prototype.retrieveState = function (resolve, reject) {
    var _this = this;
    this.stateStorage.retrieveAll(function(err, states) {
        if (err) {
            log('warn', err, _this.debugMode);
            return reject && reject(err);
        }

        for (var channelLabel in states) {
            var state = states[channelLabel];
            state.channelLabel = channelLabel;
        }

        resolve && resolve(states || {});
    });
};

/**
 * @param state {Object}
 * @param callback {Function}
 */
VectorWatchStreamNode.prototype.getAuthTokensForState = function(state, callback) {
    this.oauthClient.getAccessToken(state.__auth, callback);
};

/** Delete al settings from the DB.
 * @param resolve {Function} DB update/delete success callback
 * @param reject {Function} DB update/delete fail callback
 * @returns null
 *
 **/
VectorWatchStreamNode.prototype.dbCleanUp = function (resolve, reject) {
    var _this = this;
    this.stateStorage.removeAll(function(err) {
        if (err) {
            log('warn', err, _this.debugMode);
            return reject && reject(err);
        }

        log('log', "Deleted all rows", _this.debugMode);
        resolve && resolve();
    });
};

VectorWatchStreamNode.prototype.getMiddleware = function() {
    return this.app;
};

VectorWatchStreamNode.prototype.startStreamServer = function(port, callback) {
    this.app.listen(port, callback);
};

VectorWatchStreamNode.prototype.changeAuthTokensForState = function(state, authTokens) {
    this.oauthClient.storeAccessToken(state, authTokens, function() {

    });
};


privateMethods = {
    setupRouter: function () {
        var _this = this;
        this.app = express();
        this.app.use(bodyParser.urlencoded({ extended: true })); //support x-www-form-urlencoded
        this.app.use(bodyParser.json());
        this.app.use(expressValidator());
        this.app.use(function (req, res, next) {
            log('log', req.method + '' + req.url, _this.debugMode);
            next();
        });

        this.app.post('/callback', function (req, res, next) {
            req.assert('eventType', 'Event type is required').notEmpty();
            log('log', req.body, _this.debugMode);
            var errors = req.validationErrors();
            if (errors) {
                log('warn', "Vaidation errors encountered", _this.debugMode);
                res.status(400).json(errors);
                return;
            }
            log('log', "Request passed validation", _this.debugMode);
            var eventType = req.body.eventType;

            var state = privateMethods.getStateFromRequest.call(_this, req);
            if (eventType == "USR_REG") {
                privateMethods.registerHandler.call(_this, state, state.channelLabel, res);
            } else if (eventType == "USR_UNREG") {
                privateMethods.unregisterHandler.call(_this, state, res);
            } else if (eventType == "REQ_AUTH") {
                privateMethods.authHandler.call(_this, res);
            } else if (eventType == "REQ_CONFIG") {
                privateMethods.configHandler.call(_this, state.__auth, res);
            } else if (eventType == "REQ_OPTS") {
                req.assert('settingName', 'Setting name is required').notEmpty();

                var settingName = req.body.settingName;
                var searchTerm = req.body.value || '';
                privateMethods.optionsHandler.call(_this, settingName, searchTerm, state, res);
            } else {
                return next("No known event");
            }
        });
    },

    registerHandler: function registerHandler(state, channelLabel, response) {
        var promise = new Promise(), _this = this;
        promise.then(function (streamValue) {
            log('log', "Registration successfull, the response containing " + streamValue + " is being sent", true);

            response.status(200).json({
                v: 1,
                p: [
                    {
                        type: 3,
                        streamUUID: _this.streamUID,
                        channelLabel: channelLabel,
                        d: streamValue
                    }
                ]
            });
        }, function (reason, statusCode) {
            log('log', "Registration unsuccessfull, the response containing the error message is being sent", true);
            response.status(statusCode || 400).json(reason);
        });

        privateMethods.storeSettingsItem.call(
            this, state,
            function() {
                _this.oauthClient.getAccessToken(state.__auth, function(err, tokens) {
                    if (err) return promise.reject(err);

                    _this.registerSettings(function (result) {
                        promise.resolve(result);
                    }, function (err) {
                        promise.reject(err);
                    }, state, tokens);
                });
            },
            function (err) {
                promise.reject(err);
            }
        );
    },

    unregisterHandler: function unregisterHandler(state, response) {
        var _this = this;
        privateMethods.deleteSettings.call(
            this, state,
            function() {
                _this.oauthClient.getAccessToken(state.__auth, function(err, tokens) {
                    if (err) return response.sendStatus(500);

                    _this.unregisterSettings(state, tokens);
                    response.sendStatus(200);
                });
            },
            function () {
                response.sendStatus(500);
            }
        );
    },

    authHandler: function authHandler(response) {
        if (!this.options.auth) {
            return response.sendStatus(400);
        }

        var promise = new Promise(), _this = this;
        promise.then(function(authMethod) {
            log('log', "Request auth method successfull, the response containing " + authMethod + " is being sent", true);

            response.status(200).json({
                v: 1,
                p: authMethod
            });
        }, function(reason, statusCode) {
            log('log', "Request auth method unsuccessfull, the response containing the error message is being sent.", true);
            response.status(statusCode || 400).json(reason);
        });

        this.oauthClient.getAuthorizationUrl(function(err, url) {
            if (err) return promise.reject(err);

            promise.resolve({
                protocol: _this.oauthClient.getProtocolName(),
                version: _this.oauthClient.getVersion(),
                loginUrl: url
            });
        });
    },

    configHandler: function configHandler(auth, response) {
        var promise = new Promise(), _this = this;
        promise.then(function(config) {
            log('log', "Request stream config successful, the response containing " + config + " is being sent", true);

            response.status(200).json({
                v: 1,
                p: config
            });
        }, function(reason, statusCode) {
            log('log', "Request config unsuccessful, the response containing the error message is being sent.", true);
            response.status(statusCode || 400).json(reason);
        });

        this.oauthClient.getAccessToken(auth, function(err, tokens) {
            if (err) return promise.reject(err);

            _this.requestConfig(function(result) {
                promise.resolve(result);
            }, function(err) {
                promise.reject(err);
            }, tokens);
        });
    },

    optionsHandler: function optionsHandler(settingName, searchTerm, state, response) {
        var promise = new Promise(), _this = this;
        promise.then(function(options) {
            log('log', "Request options successful, the response containing " + options + " is being sent", true);

            response.status(200).json({
                v: 1,
                p: options
            });
        }, function (reason, statusCode) {
            log('log', "Request options unsuccessful, the response containing the error message is being sent.", true);
            response.status(statusCode || 400).json(reason);
        });

        this.oauthClient.getAccessToken(state.__auth, function(err, tokens) {
            _this.requestOptions(function (result) {
                promise.resolve(result);
            }, function (err) {
                promise.reject(err);
            }, settingName, searchTerm, state, tokens);
        });
    },

    getStateFromRequest: function getStateFromRequest(req) {
        var cleanUserSettings = function(userSettings) {
            var cleaned = { };
            for (var setting in userSettings) {
                var settingObject = userSettings[setting];
                var value = settingObject.value;
                var name = settingObject.name;

                cleaned[setting] = value || name || settingObject;
            }
            return cleaned;
        };

        var state = {};
        if (req.body.userSettings) {
            state = cleanUserSettings(req.body.userSettings);
        } else if (req.body.configStreamSettings) {
            var userSettingsMap = req.body.configStreamSettings.userSettingsMap || {};
            for (var channelLabel in userSettingsMap) {
                state = cleanUserSettings(userSettingsMap[channelLabel].userSettings || {});
                state.channelLabel = channelLabel;
                state.__auth = userSettingsMap[channelLabel].auth;
            }
        }
        if (req.body.auth) {
            state.__auth = req.body.auth;
        }

        return state;
    },

    storeSettingsItem: function storeSettingsItem(state, resolve, reject) {
        var _this = this;
        this.stateStorage.store(state.channelLabel, state, function(err) {
            if (err) {
                log('warn', err, _this.debugMode);
                return reject && reject(err);
            }

            log('log', "Setting table updated.", _this.debugMode);
            resolve && resolve();
        });
    },

    deleteSettings: function deleteSettings(state, resolve, reject) {
        var _this = this;
        this.stateStorage.remove(state.channelLabel, function(err) {
            if (err) {
                log('warn', err, _this.debugMode);
                return reject && reject(err);
            }

            log('log', "Setting table updated.", _this.debugMode);
            resolve && resolve();
        });
    }
};


module.exports = {
    /**
     * @param options {Object}
     * @returns {VectorWatchStreamNode}
     */
    createStreamNode: function(options) {
        var node = new VectorWatchStreamNode(options);

        if (options.registerSettings) {
            node.registerSettings = options.registerSettings;
        }
        if (options.unregisterSettings) {
            node.unregisterSettings = options.unregisterSettings;
        }
        if (options.requestConfig) {
            node.requestConfig = options.requestConfig;
        }
        if (options.requestOptions) {
            node.requestOptions = options.requestOptions;
        }

        return node;
    }
};
