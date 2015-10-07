var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    server = express(),
    expressValidator = require('express-validator'),
    request = require('request'),
    mysql = require('mysql');
util = require('util');
var Promise = require("node-promise").Promise;

var StreamData = function (data, settings, userId) {
    this.data = data;
    this.settings = settings;
    this.userId = userId;
};

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
     * @returns {null}
     * */
    this.registerSettings = function (resolve, reject, settings) {
    };

    /** This function is called every time a user removes the stream from a watch face.
     Called for public streams
     * @param settings {Object} User settings
     * @returns {null}
     * */
    this.unregisterSettings = function (settings) {
    };

    /** This function is called every time a user adds the stream to a watch face(and selects the desired settings, if needed).
     * The DB(if the stream has settings that need to be stored) is automatically updated.
     * When implementing this method the developer must call the 'resolve' function parameter after he retrives/generates the data.
     *      resolve({data:"..."});
     * Called for private streams
     * @param resolve {Function} DB insert success callback
     * @param reject {Function} DB insert fail callback
     * @param userId {int} User ID
     * @param settings {Object} user settings
     * @returns {null}
     * */
    this.registerUser = function (resolve, reject, userId, settings) {};

    /**
     * This function is called every time the user adds a stream to a watch face, before making any changes to the settings.
     * When implementing this method, the developer must call the 'resolve' function parameter after he generates the auth method.
     *      resolve({protocol: 'oauth', version: '1.0', ...});
     * Called from private stream
     * @param resolve
     * @param reject
     */
    this.requestAuthMethod = function(resolve, reject) {};

    /** This function is called every time a user removes the stream from a watch face.
     Called for private streams
     * @param settings {Object} user settings
     * @returns {null}
     * */
    this.unregisterUser = function (settings) {
    };

    this.dbConnection = null;
    this.debugMode = false;

    /******Private******/
    var portNumber = 3500, token, streamUID, streamType, localStorage, hasSettings = true, devMode = false, defaultSettings = "", pushURL = "http://localhost:8080/VectorCloud/rest/v1/app/push", self = this;//52.16.43.57
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
        } else {
            devMode = true;
            localStorage = [];
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
        server.use(express.static(path.join(__dirname, 'public')));
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
            log('log', "Method expects an array. Example:[{data:'...', settingsItem:'...'}]");
        }
        var requestBody = [];
        dataArray.forEach(function (element) {
            var packagedData = getStreamDataObject(element.data, wrapSettingsForPush(element.settingsItem), element.settingsItem.channelLabel);
            requestBody.push({
                streamUUID: streamUID,
                streamData: packagedData,
                settings: wrapSettingsForPush(element.settingsItem)
            });

        });
        log('log', "The data is sent to VectorCloud.", true);
        log('log', requestBody, this.debugMode);
        var options = {
            uri: pushURL,
            method: 'POST',
            json: requestBody,
            headers: {"Authorization": token}
        };
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                log('log', body, self.debugMode);
            } else {
                log('log', error, self.debugMode);
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
        if (devMode) {
            resolve(localStorage);
        } else {
            var settingsArray = [];
            this.dbConnection.query("SELECT settings FROM Settings", function (err, rows) {
                if (err) {
                    log('warn', err, self.debugMode);
                    if (reject) {
                        reject(err);
                    }
                } else {
                    var settingsArray = [], settings, temp;
                    rows.forEach(function (element) {
                        settings = JSON.parse(element.settings);
                        temp = {};
                        for (setting in settings) {
                            if (setting != 'channelLabel') {
                                temp[setting] = settings[setting].name;
                            } else {
                                temp[setting] = settings[setting];
                            }
                        }
                        settingsArray.push(temp);
                    });
                    if (resolve) {
                        resolve(settingsArray);
                    } else {
                        log('log', 'No callback', self.debugMode);
                    }
                }
            });
        }
    };

    /** Delete al settings from the DB.
     * @param resolve {Function} DB update/delete success callback
     * @param reject {Function} DB update/delete fail callback
     * @returns null
     *
     **/
    this.dbCleanUp = function (resolve, reject) {
        if (devMode) {
            localStorage = [];
        } else {
            self.dbConnection.query("DELETE FROM Settings", function (err) {
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
        }
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
            var user_id = req.body.userKey;
            var settingsMap = req.body.configStreamSettings ? req.body.configStreamSettings.userSettingsMap : {};
            var channelLabel = getKey(settingsMap);

            defaultSettings = settingsMap;
            if (eventType == "USR_REG") {
                registerHandler(settingsMap, channelLabel, user_id, res);
            } else if (eventType == "USR_UNREG") {
                unregisterHandler(settingsMap, user_id, res);
            } else if (eventType == "REQ_AUTH") {
                authHandler(res);
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
        var settingsText = JSON.stringify(wrapSettingsForDB(settings, settings.channelLabel));
        if (devMode) {
            if (!isInLocalStorage(settings)) {
                localStorage.push(settings);
            }
            console.log("localStorage");
            console.log(localStorage);
            if (resolve) {
                resolve();
            } else {
                log('log', 'No callback', self.debugMode);
            }
        } else {
            self.dbConnection.query("INSERT INTO Settings (channelLabel, settings) VALUES (?, ?) ON DUPLICATE KEY UPDATE count = count+1", [settings.channelLabel, settingsText], function (err) {
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
    }

    /** Delete the given setting from the db
     * @param settings {Object} User settings
     * @param resolve {Function} DB update/delete success callback
     * @param reject {Function} DB update/delete fail callback
     * @returns null
     *
     **/
    function deleteSettings(settings, resolve, reject) {
        if (devMode) {
            if (isInLocalStorage(settings)) {
                localStorage.pop(settings);
            }
        } else {
            self.dbConnection.query("UPDATE Settings SET count=count-1 WHERE channelLabel=?", [settings.channelLabel], function (err) {
                if (err) {
                    log('warn', err, self.debugMode);
                    if (reject) {
                        reject(err);
                    }
                } else {
                    self.dbConnection.query("DELETE FROM Settings WHERE count <= 0", function (err) {
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
            });
        }
    }

    /** Set the function that returns the stream value for a given setting/settings
     * @param pushDataContent {String/int}
     * @param settingsMap {Object}
     * @param channelLabel {String}
     * @returns {Object}
     *
     **/
    function getStreamDataObject(pushDataContent, settingsMap, channelLabel) {
        if (hasSettings) {
            if (!channelLabel) {
                channelLabel = settingsMap.channelLabel;
            }
        } else {
            settingsMap = defaultSettings;
            if (channelLabel == null) {
                channelLabel = getKey(settingsMap);
            }
        }
        var deliverRequest = {v: 1, p: []};
        if (pushDataContent != null) {
            pushDataContent = {
                type: 3,
                streamUUID: streamUID,
                channelLabel: channelLabel,
                d: pushDataContent
            };
            deliverRequest.p.push(pushDataContent);
        }
        return deliverRequest;
    }

    /** Calls the developer defined registration function(registerSettings/registerUser). The developer calls the resolve or reject parameter function depending on the outcome.
     * @param settingsMap {Object}
     * @param channelLabel {String}
     * @param userId {int}
     * @param response {Object}
     * @returns {null}
     **/
    function registerHandler(settingsMap, channelLabel, userId, response) {
        var promise = new Promise();
        promise.then(function (streamData) {
            log('log', "Registration successfull, the response containing " + streamData.data + " is being sent", true);
            streamData = getStreamDataObject(streamData.data, settingsMap, channelLabel);
            response.status(200).json(streamData);
        }, function (reason, statusCode) {
            statusCode = statusCode ? statusCode : 400;
            log('log', "Registration unsuccessfull, the response containing the error message is being sent", true);
            response.status(statusCode).json(reason);
        });
        switch (streamType) {
            case "public":
                storeSettingsItem(cleanSettings(settingsMap),
                    function () {
                        /*Db INSERT success: the used defined function is being called*/
                        self.registerSettings(function (result) {
                            promise.resolve(result);
                        }, function (error) {
                            promise.reject(error);
                        }, cleanSettings(settingsMap));
                    },
                    function () {
                        /*Db INSERT failed*/
                        log('log', "Db INSERT failed", true);
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
     * @param userId {int}
     * @param response {Object}
     * @returns {null}
     *
     **/
    function unregisterHandler(settings, userId, response) {
        switch (streamType) {
            case "public":
                deleteSettings(cleanSettings(settings),
                    function () {
                        /*Db DELETE success: the used defined function is being called*/
                        self.unregisterSettings(cleanSettings(settings));
                        response.sendStatus(200);
                    },
                    function () {
                        /*Db INSERT failed*/
                        log('log', "Db DELETE failed", true);
                    });

                break;
            case 'private':
                //TODO
                break;
            default:
        }
    }

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
                self.requestAuthMethod(function(result) {
                    promise.resolve(result);
                }, function(error) {
                    promise.reject(error);
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
        var ret = {};
        for (var key in settingsMap) {
            for (var k2 in settingsMap[key].userSettings) {
                ret[k2] = settingsMap[key].userSettings[k2].name;
                ret.channelLabel = key;
            }
        }
        return ret;
    }

    /** Removes the received settings object overheard so the developer only handles the settings themselves.
     * @param settings {Object}
     * @param uniqueLabel {String}
     * @returns {Object}
     *
     **/
    function wrapSettingsForDB(settings, uniqueLabel) {
        var wrappedSettings = {};
        for (key in settings) {
            wrappedSettings[key] = {"name": settings[key]};
        }
        wrappedSettings.channelLabel = uniqueLabel;
        return wrappedSettings;
    }

    /** Removes the received settings object overheard so the developer only handles the settings themselves.
     * @param settings {Object}
     * @returns {Object}
     *
     **/
    function wrapSettingsForPush(settings) {
        var wrappedSettings = {};
        wrappedSettings[settings.channelLabel] = {uniqueLabel: settings.channelLabel, userSettings: {}};
        for (key in settings) {
            wrappedSettings[settings.channelLabel].userSettings[key] = {"name": settings[key]};
        }
        return wrappedSettings;
    }

    function getKey(settingsMap) {
        for (key in settingsMap) {
            return key;
        }
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

    function isInLocalStorage(settingsItem) {
        var bool = false;
        for (var i = 0; i < localStorage.length; i++) {
            bool = true;
            for (key in settingsItem) {
                if (localStorage[i][key].indexOf(settingsItem[key]) == -1) {

                    bool = false;
                }
            }

            if (bool) {
                break;

            }
        }
        return bool;

    }
};
module.exports = new VectorWatchStream();