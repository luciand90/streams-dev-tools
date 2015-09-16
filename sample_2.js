var sample_stream = require('./index.js');

/*************Custom code**********/
var counter = 0;
var array = [];
var token = '***';
function updateAll() {
    array.push(sample_stream.packageRequestForData(counter++, ""));
    sample_stream.sendDeliverRequests(array);
}

/*************Custom code**********/
/*The streamUUID is provided by Vector*/
sample_stream.streamUUID = "sampleStream";

sample_stream.defaultSetting = {
    "sampleStreamDefaultChannel": {
        'uniquelabel': "sampleStreamDefaultChannel", userSettingsMap: {
            "setting": "default"
        }
    }
};
sample_stream.token = token;
var dbConnection = sample_stream.establishDBConnection('streams.cr7imnqs1tiv.us-east-1.rds.amazonaws.com', 'admin', 'mamaaremere', 'streams');
sample_stream.registerSettings = function (userId, settingsMap, callback) {
    var convertFrom = null
    var convertTo = null
    console.log("Settings map " + JSON.stringify(settingsMap));
    for (label in settingsMap) {
        convertFrom = settingsMap[label].userSettings["Convert 1"].name.trim();
        convertTo = settingsMap[label].userSettings["To"].name.trim();
        break;
    }

    var process = function (callback) {
        var query = dbConnection.query("INSERT INTO t_user (user_id, state) VALUES (?, 'USR_REG') ON DUPLICATE KEY UPDATE state = 'USR_REG'", [user_id], function (err, rows) {
            if (err) {
                console.log(err);
                return next("Mysql error, check your query");
            }
            console.log("Updated user status settings for request" + JSON.stringify(settingsMap));


            for (var keySet in settingsMap) {
                var settings = settingsMap[keySet].userSettings;

                for (var key in settings) {
                    var elem = settings[key];
                    var obj = [user_id + "_" + keySet + "_" + key, key, elem.name, user_id, keySet];
                    console.log("Inserting object in database : " + JSON.stringify(obj));
                    var query = mysqlConnection.query("INSERT INTO settings (id, name, value, user_id, uniqueLabel) VALUES (?) ON DUPLICATE KEY UPDATE  value = ? ", [obj, elem.name], function (err, rows) {
                        if (err) {
                            console.log(err);
                            return next("Mysql error, check your query");
                        }
                    });
                }
            }

            callback(user_id, settingsMap);
        });
    };
};

sample_stream.unregisterUser = function (user_id, settingsMap) {
    var labels = [];
    for (var uniqueLabel in settingsMap) {
        labels.push(uniqueLabel);
    }

    console.log("DELETE " + user_id + " " + labels);
    var query = mysqlConnection.query("DELETE FROM settings WHERE user_id = ? AND uniqueLabel IN ( ? )", [user_id, labels], function (err, rows) {
        if (err) {
            console.log(err);
        }
    });
};

sample_stream.startServer(function () {
    console.log("Listening to port %s", 3000);
    //updateAll();
});

function refreshAllStreamsData(callback, next) {
    console.log("refreshAllStreamsData Called!!!!!!!!");
    mysqlConnection.query("select GROUP_CONCAT(value SEPARATOR '') as value from settings where name in ('Convert 1', 'To') group by uniqueLabel, user_id", function (err, rows) {
        if (err) {
            console.log(err);
            return;
        }
        rate_fromto = [];

        for (index in rows) {
            rate_fromto.push(rows[index].value);
        }

        console.log("Rates : " + rate_fromto);

        request(getAPIUrl([rate_fromto]), function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var json = JSON.parse(body);
                console.log("Yahoo API json response:", JSON.stringify(json));
                if (json.query.results == null) {
                    console.log("no results");
                    return "Results are null";
                }
                rates = updateRatesObject(json.query.results.rate);
                console.log("test-------------");
                console.log(rates);

                if (typeof(callback) != "undefined" && callback != null)
                    callback(next);
            }
        });
    });
}

/*
 * getAllUserSettings updates the globalUserSettingsMap variable with a list of all users and their settings
 */

function getAllUserSettings(callback) {

    console.log("GET settingsCALLEd CALLED!!!!!!!!!!!!!!!!!!");

    globalUserSettingsMap = {};
    mysqlConnection.query('SELECT DISTINCT name, value, uniqueLabel FROM settings GROUP BY uniqueLabel, name, value;', function (err, rows) {
        //Build the settings map and cities array:
        globalUserSettingsMap = [];


        for (index in rows) {
            //For every setting corresponding to the current channel settings.
            console.log(rows[index].uniqueLabel + rows[index].name + " :" + rows[index].value);

            //All the settings are placed in the corresponding userSettings object
            if (typeof(globalUserSettingsMap[rows[index].uniqueLabel]) == 'undefined' || globalUserSettingsMap[rows[index].uniqueLabel] == null) {

                var uniqueLabel = rows[index].uniqueLabel;

                globalUserSettingsMap[uniqueLabel] = {
                    userSettingsMap: {}
                };

                globalUserSettingsMap[uniqueLabel].userSettingsMap[uniqueLabel] = {
                    uniqueLabel: rows[index].uniqueLabel,
                    userSettings: {}
                }
            }

            globalUserSettingsMap[rows[index].uniqueLabel].userSettingsMap[uniqueLabel].userSettings[rows[index].name] = {name: rows[index].value};
        }

        if (typeof(callback) != "undefined" && callback != null)
            callback(globalUserSettingsMap);
    });
}

// custom rates functions

var rates = {};
var rate_fromto = [];

function updateRatesObject(vals) {
    console.log("vals:", vals);
    var rates = {};
    if (vals.length) {
        for (var key in vals) {
            var keyToStore = vals[key].id;//rate_fromto[key].toUpperCase();
            rates[keyToStore] = getExchangeRates(vals[key]);
        }
    } else {
        rates[rate_fromto[0]] = getExchangeRates(vals);
    }
    return rates;
}

function getExchangeRates(elem) {
    if (typeof elem != 'undefined' && elem != null) {
        if (elem.Rate != null) {
            return parseInt(elem.Rate * 100) / 100 + "";
        }
    }
}


function getSingleRate(convertFrom, convertTo, res, callback) {

    console.log("GET SINGLE TICKER");

    request(getAPIUrl([convertFrom + convertTo]), function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var json = JSON.parse(body);

            if (json.query.results == null) {
                console.log("no results");
                callback(res);
                return "Results are null";
            }
            var keyToStore = convertFrom.toUpperCase() + convertTo.toUpperCase();
            if (json.query.results.rate != null) {

                rates[keyToStore] = getExchangeRates(json.query.results.rate);

                if (typeof(callback) != "undefined" && callback != null)
                    callback(res);

            } else {

            }
            console.log("SINGLE convertFrom-------------" + JSON.stringify(rates[keyToStore]));


        } else {
            console.log("Yahoo Error");
            console.log(error);
            //var keyToStore = convertFrom.toUpperCase();
            //rates[keyToStore] = undefined;
            callback(res);
            return "Results are null";
        }
        ;
    });
}

function getAPIUrl(pairs) {

    var queryString = "";
    var symbol;
    for (var i = 0; i < pairs.length; i++) {
        var symbol = pairs[i];
        queryString = queryString + '"' + symbol + '"';

        if (i < pairs.length - 1) {
            queryString = queryString + ",";
        }
    }
    var query = encodeURI('select * from yahoo.finance.xchange where pair in (' + queryString + ')');
    var url = "https://query.yahooapis.com/v1/public/yql?q=" + query + "&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=";
    console.log(url);
    return url;
}
