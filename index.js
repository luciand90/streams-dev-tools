var express = require('express'),
    bodyParser = require('body-parser'),
    expressValidator = require('express-validator'),
    request = require('request'),
    mysql = require('mysql'),
    OAuthProvider = require('./lib/OAuthProvider.js'),
    Promise = require("node-promise").Promise,
    SendBuffer = require('./lib/SendBuffer.js'),
    Logstash = require('logstash-client'),
    colors = require('colors');

var ERROR_CODES = {
    "BAD_REQUEST": 400,
    "INTERNAL_SERVER_ERROR": 500,
    "INFORMATION_NOT_FOUND": 404,
    "UNAUTHORIZED": 401,
    "DEV_CODE_ERROR": 500
};

/**********Logginng**********/
var LogLevels = {
    error: {method: 'error', log: 'ERROR', color: 'red'},
    warning: {method: 'warn', log: 'WARNING', color: 'yellow'},
    info: {method: 'log', log: 'INFO', color: 'green'}
};

var logstashConfig = {
    type: 'tcp',
    host: '52.18.56.123',
    port: 8000
};

/**********Logging**********/

function establishDBConnection(dbSettings) {
    if (dbSettings.connection) {
        return dbSettings.connection;
    }

    return mysql.createConnection(dbSettings);
}


var VectorWatchStreamNode = function VectorWatchStreamNode(options) {
    if (typeof options != "object" && Object.prototype.toString.call(options) == '[object Array]') {
        throw new Error('options have to be an object.');
    }
    this.options = options;
    this.logstash = false;
    var _this = this;

    if (!options.token) {
        throw new Error('token is required.');
    }
    this.token = options.token;

    if (!options.streamUUID) {
        throw new Error('streamUUID is required.');
    }
    this.streamUUID = options.streamUUID;
    this.contentVersion = options.contentPVersion;
    this.streamVersion = options.version;

    if (options.database) {
        var connection = establishDBConnection(options.database);
        this.dbConnection = connection;
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
    this.sendBuffer.on('flush', function (packets) {
        privateMethods.log("The data is sent to VectorCloud.", LogLevels.info, true, _this.logstash);
        privateMethods.log("Number of update requests:" + packets.length, LogLevels.info, true, _this.logstash);
        var options = {
            uri: pushURL,
            method: 'POST',
            json: packets,
            headers: {"Authorization": _this.token}
        };
        request(options, function (err, response, body) {
            if (!err && response.statusCode == 200) {
                privateMethods.log("Server response OK. Message: " + body.message, LogLevels.info, true, _this.logstash);
            } else {
                if (response) {
                    if (response.statusCode == 400 && response.statusCode == 500) {
                        privateMethods.log("Error response(status:" + response.statusCode + ") - " + err, LogLevels.error, true, _this.logstash);
                    } else {
                        privateMethods.log("Error response(status:" + response.statusCode + ") - " + err, LogLevels.warning, true, _this.logstash);
                    }
                } else {
                    //No response received:
                    privateMethods.log("Error response - " + err, LogLevels.error, true, _this.logstash);

                }
            }
        });
    });

    privateMethods.setupRouter.call(this);
};

/** This method is called in order to retrieve all the settings(name, order, display option) when an user adds the stream to a watch-face.
 * Call the resolve() method with a Config Object as a parameter for success or the reject() method with an error message.
 * @param resolve {Function}
 * @param reject {Function}
 * @param authTokens {Object}
 * @returns {null}
 */
VectorWatchStreamNode.prototype.requestConfig = function (resolve, reject, authTokens) {
    reject && reject(new Error('Not implemented.'));
};

/** This method is called in order to retrieve all the options for a particular setting(given by the settingName parameter).
 *  Call the resolve() method with an array of SettingValue objects for success or the reject() method with an error message.
 *  The state parameter holds all the previous settings
 * @param resolve {Function}
 * @param reject {Function}
 * @param settingName {String}
 * @param searchTerm {String}
 * @param state {Object}
 * @param authTokens {Object}
 * @returns {null}
 */
VectorWatchStreamNode.prototype.requestOptions = function (resolve, reject, settingName, searchTerm, state, authTokens) {
    reject && reject(new Error('Not implemented.'));
};

/** This method is called every time a user selects the desired settings.
 * The DB(if not in dev mode) is automatically updated.
 * When implementing this method the developer must call the 'resolve' function parameter after he retrieves/generates the data.
 * @param resolve {Function} Success callback
 * @param reject {Function} Fail callback
 * @param settings {Object} User settings
 * @param authTokens {Object} Authentication information
 * @returns {null}
 * */
VectorWatchStreamNode.prototype.registerSettings = function (resolve, reject, settings, authTokens) {
    reject && reject(new Error('Not implemented.'));
};

/** This method is called every time a user removes the stream from a watch-face.
 * @param resolve {Function} Success callback
 * @param reject {Function} Fail callback
 * @param settings {Object} User settings
 * @param authTokens {Object}
 * @returns {null}
 * */
VectorWatchStreamNode.prototype.unregisterSettings = function (resolve, reject, settings, authTokens) {
    resolve(settings.channelLabel);
};

/** This method will put the 'data' String for the given channel(state) in the cache object and send it
 * to the cloud after the delay has passed.
 * After that all the users that listen to that channel will see the new information.
 * @param state {Object}
 * @param data {String}
 * @param delayInMinutes {Number}
 * @returns {VectorWatchStreamNode}
 */
VectorWatchStreamNode.prototype.push = function (state, data, delayInMinutes) {
    delayInMinutes = delayInMinutes || 5;
    this.sendBuffer.add({
        type: 3,
        streamUUID: this.streamUUID,
        channelLabel: state.channelLabel,
        contentVersion: this.contentVersion,
        streamVersion: this.streamVersion,
        d: data
    }, delayInMinutes * 60 * 1000);
    return this;
};

/** This method will flush the cache and send all the information to the cloud.
 * @returns {VectorWatchStreamNode}
 */
VectorWatchStreamNode.prototype.pushNow = function () {
    this.sendBuffer.flush();
    return this;
};

/** This method will inform the mobile app that the user's authentification has expired
 * @param state {Object}
 * @returns {VectorWatchStreamNode}
 */
VectorWatchStreamNode.prototype.authTokensForStateExpired = function (state) {
    this.sendBuffer.add({
        type: 5,
        streamUUID: this.streamUUID,
        channelLabel: state.channelLabel
    }, 0);
    return this;
};

/** Get all the settings stored in the DB. On success the resolve(settingsArray) method is called, otherwise the reject(error) method.
 * The developer can access the returned array in the resolve(settingsArray) callback, as a parameter.
 Example: sample_stream.retrieveSettings(function (settingsArray) {
                console.log(settingsArray); -> {"...uniqueLabel...":{"City":"Bucharest", ...},"...uniqueLabel...":{"City":"New York", ...}, ...}
            });
 * @param resolve {Function} DB select success callback
 * @param reject {Function} DB select fail callback
 * @returns null
 *
 **/
VectorWatchStreamNode.prototype.retrieveSettings = VectorWatchStreamNode.prototype.retrieveState = function (resolve, reject) {
    var _this = this;
    this.stateStorage.retrieveAll(function (err, states) {
        if (err) {
            privateMethods.log(err, LogLevels.warning, true, _this.logstash);
            return reject && reject(err);
        }

        for (var channelLabel in states) {
            var state = states[channelLabel];
            state.channelLabel = channelLabel;
        }
        resolve && resolve(states || {});
    });
};

/** Get the authentification information for the given 'state'
 * @param state {Object}
 * @param callback {Function}
 */
VectorWatchStreamNode.prototype.getAuthTokensForState = function (state, callback) {
    privateMethods.getAccessToken.call(this, state.__auth, callback);
};

/** Delete al settings from the DB.
 * @param resolve {Function} DB update/delete success callback
 * @param reject {Function} DB update/delete fail callback
 * @returns null
 **/
VectorWatchStreamNode.prototype.dbCleanUp = function (resolve, reject) {
    var _this = this;
    this.stateStorage.removeAll(function (err) {
        if (err) {
            privateMethods.log(err, LogLevels.warning, true, _this.logstash);
            return reject && reject(err);
        }

        privateMethods.log("Deleted all rows", LogLevels.info, true, _this.logstash);
        resolve && resolve();
    });
};

/** Returns the configurated expressJS app
 * @returns {Object}
 **/
VectorWatchStreamNode.prototype.getMiddleware = function () {
    return this.app;
};

/** Starts the server
 * @returns {Object}
 **/
VectorWatchStreamNode.prototype.startStreamServer = function (port, callback) {
    this.app.listen(port, callback);
};

/** Inserts/Updates the authentification information in the db/memory
 * @returns {Object}
 **/
VectorWatchStreamNode.prototype.changeAuthTokensForState = function (state, authTokens) {
    this.oauthClient.storeAccessToken(state, authTokens, function () {

    });
};

var productionBaseURL = 'https://endpoint.vector.watch/VectorCloud/rest/',
    stageBaseURL = 'https://api.vector.watch/VectorCloud/rest/',
    localBaseURL = 'https://localhost:8080/VectorCloud/rest/',
    pushEndpoint = '/v1/stream/push',
    pushURL = 'https://endpoint.vector.watch/VectorCloud/rest/v1/stream/push',
    privateMethods = {
        streamUUID: "",
        setupRouter: function () {
            var _this = this;
            streamUUID = this.options.streamUUID;
            this.app = express();
            this.app.use(bodyParser.urlencoded({extended: true})); //support x-www-form-urlencoded
            this.app.use(bodyParser.json());
            this.app.use(expressValidator());
            this.app.use(function (req, res, next) {
                privateMethods.log('Request method:' + req.method + '(endpoint: ' + req.url + ')', LogLevels.info, true, _this.logstash);
                next();
            });

            this.app.post('/api/callback', function (req, res, next) {
                req.assert('eventType', 'Event type is required').notEmpty();
                var errors = req.validationErrors();
                if (errors) {
                    privateMethods.log("Validation errors encountered", LogLevels.error, true, _this.logstash);
                    res.status(400).json(errors);
                    return;
                }
                privateMethods.log("Request passed validation", LogLevels.info, true, _this.logstash);
                var eventType = req.body.eventType;
                privateMethods.log('Event type: ' + eventType, LogLevels.info, true, _this.logstash);
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
        /*
         * Handles settings registration(insert or update count field) and returns the corresponding stream data calling the user defined
         * */
        log: function log(logText, level, show, stash) {
            var date = new Date(), logstashInstance;
            if (!level) {
                level = LogLevels.info;
            }
            if (show) {
                console[level.method](colors[level.color]("[" + date + "] " + logText));
            }
            if (stash) {
                logstashInstance = new Logstash(logstashConfig);
                logstashInstance.send("Node " + streamUUID + " " + level.log + " " + logText);
            }
        },
        /*
         * Handles settings registration(insert or update count field) and returns the corresponding stream data calling the user defined
         * */
        registerHandler: function registerHandler(state, channelLabel, response) {
            var promise = new Promise(), _this = this;
            promise.then(function (streamValue) {
                var httpStatus = 200;
                if (typeof streamValue == 'object') {
                    httpStatus = 904;
                    streamValue = streamValue.msg;
                }
                privateMethods.log("Registration successfull, the response containing '" + streamValue + "' is being sent", LogLevels.info, true, _this.logstash);
                response.status(httpStatus).json({
                    v: 1,
                    p: [{
                        type: 3,
                        streamUUID: _this.streamUUID,
                        channelLabel: channelLabel,
                        d: streamValue
                    }]
                });
            }, function (reason, statusCode) {
                privateMethods.log("Registration unsuccessfull, the response containing the error message is being sent", LogLevels.error, true, _this.logstash);
                privateMethods.errorHandler(response, reason, statusCode);
            });

            privateMethods.getAccessToken.call(_this, state.__auth, function (err, tokens) {
                if (err) {
                    return promise.reject(err, ERROR_CODES.UNAUTHORIZED);
                }
                try {
                    _this.registerSettings(function (result) {
                        if (typeof result == 'object') {
                            promise.resolve(result);
                        } else {
                            privateMethods.storeSettingsItem.call(_this, state, function () {
                                promise.resolve(result);
                            }, function (err) {
                                privateMethods.log("Settings could not be persisted:" + err, LogLevels.error, true, _this.logstash);
                                promise.reject(err, ERROR_CODES.INTERNAL_SERVER_ERROR);
                            });
                        }

                    }, function (err) {
                        promise.reject(err);
                    }, state, tokens);
                } catch (err) {
                    promise.reject(err, ERROR_CODES.DEV_CODE_ERROR);
                }
            });
        },

        /*
         * Handles settings unregistration(delete or update count field)
         * */
        unregisterHandler: function unregisterHandler(state, response) {
            var promise = new Promise(), _this = this;
            promise.then(function (settings) {
                for (channelLabel in settings) {
                    privateMethods.log("Unregistration successfull for channel label:" + channelLabel, LogLevels.info, true, _this.logstash);
                }
                privateMethods.log("Unregistration successfull", LogLevels.info, true, _this.logstash);
                response.status(200).json({});
            }, function (reason, statusCode) {
                privateMethods.log("Unregistration unsuccessfull", LogLevels.error, true, _this.logstash);
                privateMethods.errorHandler(response, reason, statusCode);
            });

            privateMethods.deleteSettings.call(this, state, function () {
                    privateMethods.getAccessToken.call(_this, state.__auth, function (err, tokens) {
                        if (err) {
                            return promise.reject(err, ERROR_CODES.UNAUTHORIZED);
                        }
                        try {
                            _this.unregisterSettings(function () {
                                promise.resolve();
                            }, function (err) {
                                promise.reject(err);
                            }, state, tokens);
                        } catch (err) {
                            promise.reject(err, ERROR_CODES.DEV_CODE_ERROR);
                        }
                    });
                },
                function (err) {
                    promise.reject(err, ERROR_CODES.INTERNAL_SERVER_ERROR);
                }
            );
        },

        authHandler: function authHandler(response) {
            if (!this.options.auth) {
                return response.sendStatus(400);
            }

            var promise = new Promise(), _this = this;
            promise.then(function (authMethod) {
                privateMethods.log("Request auth method successfull, the response containing " + authMethod + " is being sent", LogLevels.info, true, _this.logstash);
                response.status(200).json({
                    v: 1,
                    p: authMethod
                });
            }, function (reason, statusCode) {
                privateMethods.log("Request auth method unsuccessfull, the response containing the error message is being sent.", LogLevels.error, true, _this.logstash);
                privateMethods.errorHandler(response, reason, statusCode);
            });

            this.oauthClient.getAuthorizationUrl(function (err, url) {
                if (err) {
                    return promise.reject(err, ERROR_CODES.BAD_REQUEST);
                }

                promise.resolve({
                    protocol: _this.oauthClient.getProtocolName(),
                    version: _this.oauthClient.getVersion(),
                    loginUrl: url
                });
            });
        },

        configHandler: function configHandler(auth, response) {
            var promise = new Promise(), _this = this;
            promise.then(function (config) {
                var settingsCounter = 0, firstSetting;
                for (settingName in config.renderOptions) {
                    settingsCounter++;
                    if (config.renderOptions.hasOwnProperty(settingName) && config.renderOptions[settingName].order == 0) {
                        firstSetting = settingName;
                    }
                }
                if (config.renderOptions[firstSetting].dataType == "DYNAMIC") {
                    promise = new Promise();
                    promise.then(function (options) {
                        privateMethods.log("Request stream config successful, the response containing " + settingsCounter + " settings and " + options.length + " options for the '" + firstSetting + "' setting is being sent", LogLevels.info, true, _this.logstash);
                        config.settings = {};
                        config.settings[firstSetting] = options;
                        response.status(200).json({
                            v: 1,
                            p: config
                        });
                    }, function (reason, statusCode) {
                        privateMethods.log("Request options unsuccessful, the response containing the error message is being sent.", LogLevels.error, true, _this.logstash);
                        privateMethods.errorHandler(response, reason, statusCode);
                    });


                    try {
                        _this.requestOptions(function (result) {
                            promise.resolve(result);
                        }, function (err) {
                            promise.reject(err);
                        }, firstSetting);
                    } catch (error) {
                        promise.reject(error, ERROR_CODES.DEV_CODE_ERROR);
                    }
                } else {
                    privateMethods.log("Request stream config successful, the response containing " + settingsCounter + " settings is being sent", LogLevels.info, true, _this.logstash);
                    response.status(200).json({
                        v: 1,
                        p: config
                    });
                }
            }, function (reason, statusCode) {
                privateMethods.log("Request config unsuccessful, the response containing the error message is being sent.", LogLevels.error, true, _this.logstash);
                privateMethods.errorHandler(response, reason, statusCode);
            });

            privateMethods.getAccessToken.call(this, auth, function (err, tokens) {
                if (err) return promise.reject(err);
                try {
                    _this.requestConfig(function (result) {
                        promise.resolve(result);
                    }, function (err) {
                        promise.reject(err);
                    }, tokens);
                } catch (error) {
                    promise.reject(error, ERROR_CODES.DEV_CODE_ERROR);
                }
            });
        },

        optionsHandler: function optionsHandler(settingName, searchTerm, state, response) {
            var promise = new Promise(), _this = this;
            promise.then(function (options) {
                privateMethods.log("Request options successful, the response containing " + options.length + " options for the is being sent", LogLevels.info, true, _this.logstash);
                response.status(200).json({
                    v: 1,
                    p: options
                });
            }, function (reason, statusCode) {
                privateMethods.log("Request options unsuccessful, the response containing the error message is being sent.", LogLevels.error, true, _this.logstash);
                privateMethods.errorHandler(response, reason, statusCode);
            });

            privateMethods.getAccessToken.call(this, state.__auth, function (err, tokens) {
                try {
                    _this.requestOptions(function (result) {
                        promise.resolve(result);
                    }, function (err) {
                        promise.reject(err);
                    }, settingName, searchTerm, state, tokens);
                } catch (error) {
                    promise.reject(error, ERROR_CODES.DEV_CODE_ERROR);
                }
            });
        },

        getStateFromRequest: function getStateFromRequest(req) {
            var cleanUserSettings = function (userSettings) {
                var cleaned = {};
                for (var setting in userSettings) {
                    var settingObject = userSettings[setting];
                    var value = settingObject.value;
                    var name = settingObject.name;

                    cleaned[setting] = settingObject || name || value;
                }
                return cleaned;
            };

            var state = {};
            if (req.body.userSettings) {
                state = cleanUserSettings(req.body.userSettings);
            } else if (req.body.configStreamSettings) {
                //USR_REG
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
            this.stateStorage.store(state.channelLabel, state, function (err) {
                if (err) {
                    privateMethods.log(err, LogLevels.warning, true, _this.logstash);
                    return reject && reject(err);
                }
                privateMethods.log("Setting table updated.", LogLevels.info, true, _this.logstash);
                resolve && resolve();
            });
        },

        deleteSettings: function deleteSettings(state, resolve, reject) {
            var _this = this;
            this.stateStorage.remove(state.channelLabel, function (err) {
                if (err) {
                    privateMethods.log(err, LogLevels.warning, true, _this.logstash);
                    return reject && reject(err);
                }
                privateMethods.log("Settings deleted.", LogLevels.info, true, _this.logstash);
                resolve && resolve();
            });
        },

        getAccessToken: function (credentials, callback) {
            if (!this.options.auth) {
                return callback();
            }

            this.oauthClient.getAccessToken(credentials, callback);
        },

        errorHandler: function (response, reason, statusCode) {
            switch (statusCode) {
                case ERROR_CODES.INTERNAL_SERVER_ERROR:
                    privateMethods.log("stream-dev-tools internal error: " + reason, LogLevels.error, true, this.logstash);
                    break;
                case ERROR_CODES.UNAUTHORIZED:
                    privateMethods.log("The user is not logged in: " + reason, LogLevels.error, true, this.logstash);
                    break;
                case ERROR_CODES.DEV_CODE_ERROR:
                    privateMethods.log('error', "Dev code error: " + reason, true);
                    break;
                case ERROR_CODES.BAD_REQUEST:
                    privateMethods.log("Bad request: " + reason, LogLevels.error, true, this.logstash);
                    break;
                default:
                    privateMethods.log("Status error: " + reason, LogLevels.error, true, this.logstash);
            }
            response.status(statusCode || ERROR_CODES.BAD_REQUEST).json({"Error": reason.toString()});
        }
    };

module.exports = {
    /**
     * @param options {Object}
     * @returns {VectorWatchStreamNode}
     */
    createStreamNode: function (options) {
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
