var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    server = express(),
    expressValidator = require('express-validator'),
    request = require('request'),
    mysql = require('mysql');
var Promise = require("node-promise").Promise;

var VectorWatchStream = function () {
    var self = this;
    /*Public*/
    this.registerSettings = function () {
    };
    this.unregisterSettings = function () {
    };
    this.registerUser = function () {
    };
    this.unregisterUser = function () {
    };
    this.updateAllStreams = function () {
    };
    this.portNumber = 3001;
    this.token = "";
    this.streamUUID = "";
    this.options = true;
    this.defaultSetting = "default";
    /*Private*/
    var pushURL = "http://localhost:8080/VectorCloud/rest/v1/app/push", getChannelData = null;

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
                res.status(422).json(errors);
                return;
            }

            console.log("Request passed validation");
            var eventType = req.body.eventType;
            var user_id = req.body.userKey;
            var settingsMap = req.body.configStreamSettings ? req.body.configStreamSettings.userSettingsMap : {};
            var channelLabel;
            for (key in settingsMap) {
                channelLabel = req.body.configStreamSettings.userSettingsMap.uniqueLabel;
            }

            if (eventType == "USR_REG") {
                var promise = new Promise();
                promise.then(function (streamData) {
                    streamData = self.packageRequestForData(streamData, channelLabel);
                    res.status(200).json(streamData);
                }, function (reason) {
                    console.log('Handle rejected promise (' + reason + ') here.');
                });
                var streamData = self.registerSettings(function (result) {
                    promise.resolve(result);
                }, self.simplify(settingsMap));
            } else if (eventType == "USR_UNREG") {
                self.unregisterSettings(self.simplify(settingsMap));
                res.sendStatus(200);
            } else {
                return next("No known event");
            }
        });
        return router;
    };

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
     * @param pushDataContent {String/Object}
     * @param channelLabel {Object}
     * @param settingsMap {Object}
     * @returns {null}
     * */
    this.sendDeliverRequests = function (dataArray) {
        var requestList = [];//this.packageRequestForData(dataObject.data, dataObject.settings)
        dataArray.forEach(function (element) {
            requestList.push(self.packageRequestForData(element.data));
        });
        var options = {
            uri: pushURL,
            method: 'POST',
            json: requestList,
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
        return mysql.createConnection({
            host: host,
            user: user,
            password: password,
            database: database
        });
    };

    /** Set the function that returns the stream value for a given setting/settings
     * @param pushDataContent {String/Object}
     * @param channelLabel {Object}
     * @param settingsMap {Object}
     * @returns {Object}
     *
     **/
    this.packageRequestForData = function (pushDataContent, channelLabel) {
        if(!this.options) {
            channelLabel = channelLabel ? channelLabel : "default";
        }

        if (typeof channelLabel === 'object') {
            for (var key in channelLabel) {
                channelLabel = key;
                break;
            }
        }
        var deliverRequest = {v: 1, p: []};

        if (pushDataContent != null) {
            pushDataContent = {
                type: 3,
                streamUUID: this.streamUUID,
                channelLabel: channelLabel,
                d: pushDataContent
            };
            deliverRequest.p.push(pushDataContent);
        }
        console.log(deliverRequest);
        return deliverRequest;
    };

    this.simplify = function (settingsMap) {
        var ret = {};

        for (var key in settingsMap) {
            for (var k2 in settingsMap[key].userSettings) {
                ret[k2] = settingsMap[key].userSettings[k2].name;
            }
        }
        return ret;
    }
};
module.exports = new VectorWatchStream();