var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    server = express(),
    expressValidator = require('express-validator'),
    request = require('request'),
    mysql = require('mysql');
var Promise = require("node-promise").Promise;

var VectorWatchStream = function () {
    /*Public*/
    /** This function is called every time a user adds the stream to a watch face(and selects the desired settings, if needed).
     Called for public streams
     * @param resolve {Function} DB insert success callback
     * @param reject {Function} DB insert fail callback
     * @param settings {Object} user settings
     * @returns {null}
     * */
    this.registerSettings = function (resolve, reject, settings) {};

    /** This function is called every time a user removes the stream from a watch face.
     Called for public streams
     * @param settings {Object} user settings
     * @returns {null}
     * */
    this.unregisterSettings = function (settings) {};

    /** This function is called every time a user adds the stream to a watch face(and selects the desired settings, if needed).
     Called for private streams
     * @param resolve {Function} DB insert success callback
     * @param reject {Function} DB insert fail callback
     * @param userId {int} User ID
     * @param settings {Object} user settings
     * @returns {null}
     * */
    this.registerUser = function (resolve, reject, userId, settings) {};

    /** This function is called every time a user removes the stream from a watch face.
     Called for private streams
     * @param settings {Object} user settings
     * @returns {null}
     * */
    this.unregisterUser = function (settings) {};

    this.portNumber = 3000;
    this.token = "";
    this.streamUUID = "";
    //Public or private:
    this.streamType = "";

    this.hasSettings = true;
    this.defaultSettings = "";
    this.dbConnection = null;
    /*Private*/
    var self = this;
    var pushURL = "http://52.16.43.57:8080/VectorCloud/rest/v1/app/push", getChannelData = null;

    /*****Methods*****/

    /** Configures and returns a middlewire router instance.
     * @returns {Object}
     * */
    var getServerRouter = function (self) {
        var router = express.Router();
        router.use(function (req, res, next) {
            console.log(req.method, req.url);
            next();
        });
        router.route('/callback').post(function (req, res, next) {
            req.assert('eventType', 'Event type is required').notEmpty();
            console.log(JSON.stringify(req.body));
            var errors = req.validationErrors();
            if (errors) {
                console.log("ERRORS encountered");
                res.status(400).json(errors);
                return;
            }
            console.log("Request passed validation");
            var eventType = req.body.eventType;
            var user_id = req.body.userKey;
            var settingsMap = req.body.configStreamSettings ? req.body.configStreamSettings.userSettingsMap : {};
            var channelLabel = getKey(settingsMap);

            self.defaultSettings = settingsMap;
            if (eventType == "USR_REG") {
                registerHandler(settingsMap, channelLabel, user_id, res);
            } else if (eventType == "USR_UNREG") {
                unregisterHandler(settingsMap, user_id, res);
            } else {
                return next("No known event");
            }
        });
        return router;
    };

    /** Starts ad configures the express framework.
     * @param initAction {Function} Called after the server starts listening.
     * @returns {null}
     * */
    this.startServer = function (initAction) {
        server.use(express.static(path.join(__dirname, 'public')));
        server.use(bodyParser.urlencoded({extended: true})); //support x-www-form-urlencoded
        server.use(bodyParser.json());
        server.use(expressValidator());

        //now we need to apply our router here
        server.use('/api', getServerRouter(self));
        server.listen(this.portNumber, initAction);
    };

    /** Sends update request to Vector Cloud, with all the information needed.
     * @param dataArray {Array} The array elements contain the info that will be displayed on the watch and the coresponding settings - [data, settings]
     * @returns {null}
     * */
    this.sendDeliverRequests = function (dataArray) {
        var requestBody = [];
        console.log('dataArray');
        dataArray.forEach(function (element) {

            var packagedData = getStreamDataObject(element[0], wrapSettingsForPush(element[1]), element[1].channelLabel, "update");
            requestBody.push({
                streamUUID: self.streamUUID,
                streamData: packagedData,
                settings: wrapSettingsForPush(element[1])
            });

        });
        console.log(requestBody);
        var options = {
            uri: pushURL,
            method: 'POST',
            json: requestBody,
            headers: {"Authorization": this.token}
        };
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);
            } else {
                console.log(error + " " + JSON.stringify(body));
            }
        });
    };

    /** Initialise a mysql db connection
     * @param host {String}
     * @param user {String}
     * @param password {String}
     * @param database {String}
     * @returns {null}
     * */
    this.establishDBConnection = function (host, user, password, database) {
        this.dbConnection = mysql.createConnection({
            host: host,
            user: user,
            password: password,
            database: database
        });
        return this.dbConnection;
    };

    /** Store settings in the DB. On success the resolve() method is called, otherwise the reject(error) method.
     * @param settings {Object} User settings
     * @param resolve {Function} DB insert success callback
     * @param reject {Function}DB insert fail callback
     * @returns null
     *
     **/
    this.storeSettings = function (settings, resolve, reject) {
        var settingsText = JSON.stringify(wrapSettingsForDB(settings, settings.channelLabel));
        this.dbConnection.query("INSERT INTO Settings (channelLabel, settings) VALUES (?, ?) ON DUPLICATE KEY UPDATE count = count+1", [settings.channelLabel, settingsText], function (err) {
            if (err) {
                console.log(err);
                if (reject) {
                    reject(err);
                } else {
                    console.log('No callback');
                }
            } else {
                console.log("Setting table updated.");
                if (resolve) {
                    resolve();
                } else {
                    console.log('No callback');
                }
            }
        });
    };

    /** Get all the settings stored in the DB. On success the resolve(settingsArray) method is called, otherwise the reject(error) method.
     * The developer can access the returned array in the resolve(settingsArray) callback, as a parameter.
     * @param resolve {Function} DB select success callback
     * @param reject {Function} DB select fail callback
     * @returns null
     *
     **/
    this.retrieveSettings = function (resolve, reject) {
        var settingsArray = [];
        this.dbConnection.query("SELECT settings FROM Settings", function (err, rows) {
            if (err) {
                console.log(err);
                if (reject) {
                    reject(err);
                }
            } else {
                var settingsArray = [], settings, temp;
                console.log(rows);
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
                    console.log('No callback');
                }
            }
        });
    };

    /** Delete the given setting from the db
     * @param settings {Object} User settings
     * @param resolve {Function} DB update/delete success callback
     * @param reject {Function} DB update/delete fail callback
     * @returns null
     *
     **/
    this.deleteSettings = function (settings, resolve, reject) {
        this.dbConnection.query("UPDATE Settings SET count=count-1 WHERE channelLabel=?", [settings.channelLabel], function (err) {
            if (err) {
                console.log(err);
                if (reject) {
                    reject(err);
                }
            } else {
                self.dbConnection.query("DELETE FROM Settings WHERE count <= 0", function (err) {
                    if (err) {
                        console.log(err);
                        if (reject) {
                            reject(err);
                        } else {
                            console.log('No callback');
                        }
                    } else {
                        console.log("Setting table updated.");
                        if (resolve) {
                            resolve();
                        } else {
                            console.log('No callback');
                        }
                    }
                });
            }
        });
    };
    /***********PRIVATE METHODS************/
    /** Set the function that returns the stream value for a given setting/settings
     * @param pushDataContent {String/int}
     * @param settingsMap {Object}
     * @param channelLabel {String}
     * @returns {Object}
     *
     **/
    function getStreamDataObject(pushDataContent, settingsMap, channelLabel) {
        if (self.hasSettings) {
            console.log('test');
            if (!channelLabel) {
                channelLabel = settingsMap.channelLabel;
            }
        } else {
            settingsMap = self.defaultSettings;
            if (channelLabel == null) {
                channelLabel = getKey(settingsMap);
            }
        }
        console.log(settingsMap);

        var deliverRequest = {v: 1, p: []};
        if (pushDataContent != null) {
            pushDataContent = {
                type: 3,
                streamUUID: self.streamUUID,
                channelLabel: channelLabel,
                d: pushDataContent
            };
            deliverRequest.p.push(pushDataContent);
            //deliverRequest.settings = settingsMap;
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
            console.log("Registration successfull, the response containing the stream data is being sent");
            streamData = getStreamDataObject(streamData, settingsMap, channelLabel);
            response.status(200).json(streamData);
        }, function (reason, statusCode) {
            statusCode = statusCode ? statusCode : 400;
            console.log("Registration unsuccessfull, the response containing the error message is being sent");
            response.status(statusCode).json(reason);
        });
        switch (self.streamType) {
            case "public":
                self.registerSettings(function (result) {
                    promise.resolve(result);
                }, function (error) {
                    promise.reject(error);
                }, cleanSettings(settingsMap));
                break;
            case 'private':
                self.registerUser(function (result) {
                    promise.resolve(result);
                }, userId, cleanSettings(settingsMap));
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
        switch (self.streamType) {
            case "public":
                self.unregisterSettings(cleanSettings(settings));
                response.sendStatus(200);
                break;
            case 'private':
                self.unregisterUser(userId, cleanSettings(settings));
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
     * @param settingsMap {Object}
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
     * @param settingsMap {Object}
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
    //TODO UnregisterAll + dynamic setting value

};
module.exports = new VectorWatchStream();