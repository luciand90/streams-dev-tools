var express = require('express'),
    bodyParser = require('body-parser'),
    server = express(),
    expressValidator = require('express-validator'),
    request = require('request'),
    mysql = require('mysql'),
    util = require('util'),
    OAuthProvider = require('./lib/OAuthProvider.js');
var Promise = require("node-promise").Promise;


var VectorWatchStream = function () {
    /******Public******/
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
    this.registerSettings = function (resolve, reject, settings, authTokens) {
        reject(new Error('Not implemented.'));
    };

    /** This function is called every time a user removes the stream from a watch face.
     Called for public streams
     * @param settings {Object} User settings
     * @param authTokens {Object}
     * @returns {null}
     * */
    this.unregisterSettings = function (settings, authTokens) { };

    /**
     * @param resolve {Function}
     * @param reject {Function}
     * @param authTokens {Object}
     */
    this.requestConfig = function(resolve, reject, authTokens) {
        reject(new Error('Not implemented.'));
    };

    /**
     * @param resolve {Function}
     * @param reject {Function}
     * @param settingName {String}
     * @param searchTerm {String}
     * @param state {Object}
     * @param authTokens {Object}
     */
    this.requestOptions = function(resolve, reject, settingName, searchTerm, state, authTokens) {
        reject(new Error('Not implemented.'));
    };


    this.dbConnection = null;
    this.debugMode = false;

    /******Private******/
    var portNumber = 3500, token, streamUID, streamType, hasSettings = true, devMode = false, defaultSettings = "", pushURL = "http://localhost:8080/VectorCloud/rest/v1/app/push", self = this;//52.16.43.57
    /*****Methods*****/

    /** Receives configuration JSON provided by VectorWatch.
     * @param propJSON {Object} Called after the server starts listening.
     * @returns {null}
     * */
    this.config = function (propJSON) {
        if (typeof propJSON != "object" && Object.prototype.toString.call(dataArray) == '[object Array]') {
            log('warn', "Method expects a JSON Object.");
        }
        portNumber = setProp(portNumber, "portNumber", propJSON);
        token = setProp(token, "token", propJSON);
        streamUID = setProp(streamUID, "streamUID", propJSON);
        streamType = setProp(streamType, "streamType", propJSON);
        hasSettings = setProp(hasSettings, "hasSettings", propJSON);
        defaultSettings = setProp(defaultSettings, "defaultSettings", propJSON);

        if (propJSON.database) {
            this.dbConnection = establishDBConnection(propJSON.database.host, propJSON.database.user, propJSON.database.password, propJSON.database.database);

            var MysqlStorageProvider = require('./lib/StorageProviders/MysqlStorageProvider.js');
            this.authStorage = new MysqlStorageProvider({
                connection: this.dbConnection,
                table: 'Auth'
            });
            this.stateStorage = new MysqlStorageProvider({
                connection: this.dbConnection,
                table: 'Settings'
            });
        } else {
            devMode = true;
            localStorage = [];

            var MemoryStorageProvider = require('./lib/StorageProviders/MemoryStorageProvider.js');
            this.authStorage = new MemoryStorageProvider();
            this.stateStorage = new MemoryStorageProvider();
        }

        if (propJSON.auth) {
            var auth = propJSON.auth;
            if (auth.protocol.toLowerCase() != 'oauth') {
                throw new Error('Unsupported auth protocol.');
            }
            this.oauthClient = OAuthProvider.create(this.authStorage, auth);
        }
    };

    /** Starts the express framework.
     * @param initAction {Function} Called after the server starts listening.
     * @returns {null}
     * */
    this.startServer = function (initAction) {
        if (typeof initAction != "function") {
            log('log', "Method expects a function.");
        }
        server.use(bodyParser.urlencoded({extended: true})); //support x-www-form-urlencoded
        server.use(bodyParser.json());
        server.use(expressValidator());
        server.use('/api', getServerRouter(self));
        log('log', "Port number:" + portNumber, true);
        server.listen(portNumber, initAction);
    };

    /** Sends update request to Vector Cloud, with all the information needed.
     * @param dataArray {Array} The array elements contain the info that will be displayed on the watch and the coresponding settings - [data, settings]
     * @returns {null}
     * */
    this.sendDeliverRequests = function (dataArray) {
        if (Object.prototype.toString.call(dataArray) != '[object Array]') {
            log('log', "Method expects an array. Example:[{channelLabel: 'value for stream'}]");
        }
        var requestBody = {
            v: 1,
            p: [
                {
                    streamUUID: streamUID,
                    streamData: dataArray
                }
            ]
        };
        log('log', "The data is sent to VectorCloud.", true);
        log('log', requestBody, this.debugMode);
        var options = {
            uri: pushURL,
            method: 'POST',
            json: requestBody,
            headers: {"Authorization": token}
        };
        request(options, function (err, response, body) {
            if (!err && response.statusCode == 200) {
                log('log', body, self.debugMode);
            } else {
                log('log', err, self.debugMode);
            }
        });
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
    this.retrieveSettings = function (resolve, reject) {
        this.stateStorage.retrieveAll(function(err, states) {
            if (err) {
                log('warn', err, self.debugMode);
                if (reject) {
                    reject(err);
                }
            } else {
                for (var channelLabel in states) {
                    var state = states[channelLabel];
                    state.channelLabel = channelLabel;
                }

                if (resolve) {
                    resolve(states);
                } else {
                    log('log', 'No callback', self.debugMode);
                }
            }
        });
    };

    /**
     * @param state {Object}
     * @param callback {Function}
     */
    this.getAuthTokensForState = function(state, callback) {
        this.oauthClient.getAccessToken(state.__auth, callback);
    };

    /** Delete al settings from the DB.
     * @param resolve {Function} DB update/delete success callback
     * @param reject {Function} DB update/delete fail callback
     * @returns null
     *
     **/
    this.dbCleanUp = function (resolve, reject) {
        this.stateStorage.removeAll(function(err) {
            if (err) {
                log('warn', err, self.debugMode);
                if (reject) {
                    reject(err);
                } else {
                    log('log', 'No callback', self.debugMode);
                }
            } else {
                log('log', "Deleted all rows", self.debugMode);
                if (resolve) {
                    resolve();
                } else {
                    log('log', 'No callback', self.debugMode);
                }
            }
        });
    };


    /***********PRIVATE METHODS************/
    /** Configures and returns a middlewire router instance.
     * @returns {Object}
     * */
    var getServerRouter = function (self) {
        var router = express.Router();
        router.use(function (req, res, next) {
            log('log', req.method + '' + req.url, self.debugMode);
            next();
        });
        router.route('/callback').post(function (req, res, next) {
            req.assert('eventType', 'Event type is required').notEmpty();
            log('log', req.body, self.debugMode);
            var errors = req.validationErrors();
            if (errors) {
                log('warn', "Vaidation errors encountered", self.debugMode);
                res.status(400).json(errors);
                return;
            }
            log('log', "Request passed validation", self.debugMode);
            var eventType = req.body.eventType;

            var state = cleanSettings((req.body.configStreamSettings || {}).userSettingsMap || {});
            var auth = state.__auth || req.body.auth;
            state.__auth = auth;

            defaultSettings = state;
            if (eventType == "USR_REG") {
                registerHandler(state, state.channelLabel, res);
            } else if (eventType == "USR_UNREG") {
                unregisterHandler(state, res);
            } else if (eventType == "REQ_AUTH") {
                authHandler(res);
            } else if (eventType == "REQ_CONFIG") {
                configHandler(auth, res);
            } else if (eventType == "REQ_OPTS") {
                req.assert('settingName', 'Setting name is required').notEmpty();

                var settingName = req.body.settingName;
                var searchTerm = req.body.searchTerm || '';
                optionsHandler(settingName, searchTerm, state, res);
            } else {
                return next("No known event");
            }
        });
        return router;
    };

    /** Initialise a mysql db connection
     * @param host {String}
     * @param user {String}
     * @param password {String}
     * @param database {String}
     * @returns {null}
     * */
    var establishDBConnection = function (host, user, password, database) {
        self.dbConnection = mysql.createConnection({
            host: host,
            user: user,
            password: password,
            database: database
        });
        return self.dbConnection;
    };

    /** Store settings in the DB. On success the resolve() method is called, otherwise the reject(error) method.
     * @param settings {Object} User settings
     * @param resolve {Function} DB insert success callback
     * @param reject {Function}DB insert fail callback
     * @returns null
     *
     **/
    function storeSettingsItem(settings, resolve, reject) {
        self.stateStorage.store(settings.channelLabel, settings, function(err) {
            if (err) {
                log('warn', err, self.debugMode);
                if (reject) {
                    reject(err);
                } else {
                    log('log', 'No callback', self.debugMode);
                }
            } else {
                log('log', "Setting table updated.", self.debugMode);
                if (resolve) {
                    resolve();
                } else {
                    log('log', 'No callback', self.debugMode);
                }
            }
        });
    }

    /** Delete the given setting from the db
     * @param settings {Object} User settings
     * @param resolve {Function} DB update/delete success callback
     * @param reject {Function} DB update/delete fail callback
     * @returns null
     *
     **/
    function deleteSettings(settings, resolve, reject) {
        self.stateStorage.remove(settings.channelLabel, function(err) {
            if (err) {
                log('warn', err, self.debugMode);
                if (reject) {
                    reject(err);
                } else {
                    log('log', 'No callback', self.debugMode);
                }
            } else {
                log('log', "Setting table updated.", self.debugMode);
                if (resolve) {
                    resolve();
                } else {
                    log('log', 'No callback', self.debugMode);
                }
            }
        });
    }

    /** Calls the developer defined registration function(registerSettings/registerUser). The developer calls the resolve or reject parameter function depending on the outcome.
     * @param settingsMap {Object}
     * @param channelLabel {String}
     * @param response {Object}
     * @returns {null}
     **/
    function registerHandler(settingsMap, channelLabel, response) {
        var promise = new Promise();
        promise.then(function (streamValue) {
            log('log', "Registration successfull, the response containing " + streamValue + " is being sent", true);
            var streamData = { };
            streamData[channelLabel] = streamValue;
            response.status(200).json({
                v: 1,
                p: [
                    {
                        streamUUID: streamUID,
                        streamData: streamData
                    }
                ]
            });
        }, function (reason, statusCode) {
            statusCode = statusCode ? statusCode : 400;
            log('log', "Registration unsuccessfull, the response containing the error message is being sent", true);
            response.status(statusCode).json(reason);
        });
        switch (streamType) {
            case "public":
                storeSettingsItem(settingsMap,
                    function () {
                        /*Db INSERT success: the used defined function is being called*/
                        self.oauthClient.getAccessToken(settingsMap.__auth, function(err, tokens) {
                            if (err) return promise.reject(err);

                            self.registerSettings(function (result) {
                                promise.resolve(result);
                            }, function (err) {
                                promise.reject(err);
                            }, settingsMap, tokens);
                        });
                    },
                    function (err) {
                        /*Db INSERT failed*/
                        log('log', "Db INSERT failed", true);
                        promise.reject(err);
                    });
                break;
            case 'private':
                //TODO
                break;
            default:
        }
    }

    /** Calls the developer defined unregistration function(unregisterSettings/unregisterUser). The developer calls the resolve or reject parameter function depending on the outcome.
     * @param settings {Object}
     * @param response {Object}
     * @returns {null}
     *
     **/
    function unregisterHandler(settings, response) {
        switch (streamType) {
            case "public":
                deleteSettings(settings,
                    function () {
                        /*Db DELETE success: the used defined function is being called*/
                        self.oauthClient.getAccessToken(settings.__auth, function(err, tokens) {
                            if (err) return response.sendStatus(500);

                            self.unregisterSettings(settings, tokens);
                            response.sendStatus(200);
                        });
                    },
                    function () {
                        /*Db INSERT failed*/
                        log('log', "Db DELETE failed", true);
                        response.sendStatus(500);
                    });

                break;
            case 'private':
                //TODO
                break;
            default:
        }
    }

    /**
     * @param response {Object}
     */
    function authHandler(response) {
        var promise = new Promise();
        promise.then(
            function(authMethod) {
                log('log', "Request auth method successfull, the response containing " + authMethod + " is being sent", true);

                response.status(200).json({
                    v: 1,
                    p: authMethod
                });
            },
            function(reason, statusCode) {
                statusCode = statusCode ? statusCode : 400;
                log('log', "Request auth method unsuccessfull, the response containing the error message is being sent.", true);

                response.status(statusCode).json(reason);
            }
        );

        switch (streamType) {
            case "public":
                self.oauthClient.getAuthorizationUrl(function(err, url) {
                    if (err) return promise.reject(err);

                    promise.resolve({
                        protocol: self.oauthClient.getProtocolName(),
                        version: self.oauthClient.getVersion(),
                        loginUrl: url
                    });
                });
                break;

            case "private":
                // TODO
                break;

            default:
        }
    }

    /**
     * @param auth {Object}
     * @param response {Object}
     */
    function configHandler(auth, response) {
        var promise = new Promise();
        promise.then(
            function (config) {
                log('log', "Request stream config successful, the response containing " + config + " is being sent", true);

                response.status(200).json({
                    v: 1,
                    p: config
                });
            },
            function (reason, statusCode) {
                statusCode = statusCode ? statusCode : 400;
                log('log', "Request config unsuccessful, the response containing the error message is being sent.", true);

                response.status(statusCode).json(reason);
            }
        );

        switch (streamType) {
            case "public":
                self.oauthClient.getAccessToken(auth, function(err, tokens) {
                    if (err) return promise.reject(err);

                    self.requestConfig(function(result) {
                        promise.resolve(result);
                    }, function(err) {
                        promise.reject(err);
                    }, tokens);
                });
                break;

            case "private":
                // TODO
                break;

            default:
        }
    }

    /**
     * @param settingName {String}
     * @param searchTerm {String}
     * @param state {Object}
     * @param response {Object}
     */
    function optionsHandler(settingName, searchTerm, state, response) {
        var promise = new Promise();
        promise.then(
            function (options) {
                log('log', "Request options successful, the response containing " + options + " is being sent", true);

                response.status(200).json({
                    v: 1,
                    p: options
                });
            },
            function (reason, statusCode) {
                statusCode = statusCode ? statusCode : 400;
                log('log', "Request options unsuccessful, the response containing the error message is being sent.", true);

                response.status(statusCode).json(reason);
            }
        );

        switch (streamType) {
            case "public":
                self.oauthClient.getAccessToken(state.__auth, function(err, tokens) {
                    self.requestOptions(function (result) {
                        promise.resolve(result);
                    }, function (err) {
                        promise.reject(err);
                    }, settingName, searchTerm, state, tokens);
                });
                break;

            case "private":
                // TODO
                break;

            default:
        }
    }

    /** Removes the received settings object overheard so the developer only handles the settings themselves.
     * @param settingsMap {Object}
     * @returns {Object}
     *
     **/
    function cleanSettings(settingsMap) {
        var cleaned = {};
        for (var channelLabel in settingsMap) {
            var userSettings = settingsMap[channelLabel].userSettings;
            for (var setting in userSettings) {
                cleaned[setting] = userSettings[setting].name;
            }
            cleaned.channelLabel = channelLabel;
            cleaned.__auth = settingsMap[channelLabel].auth;
        }
        return cleaned;
    }

    function log(type, text, force) {
        if (force) {
            console[type](util.inspect(text, {colors: true, depth: null}));
        }
    }

    function setProp(property, propertyName, propertiesJSON) {
        if (propertiesJSON.hasOwnProperty(propertyName) && propertiesJSON[propertyName]) {
            property = propertiesJSON[propertyName];
        } else {
            log('log', propertyName + " not set");
        }
        return property;
    }
};
module.exports = new VectorWatchStream();