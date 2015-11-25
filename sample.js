var streamDevTools = require('./index.js');
var configJSON = {
    streamUUID: "***",
    streamType: "public",
    hasSettings: true,
    token: "***",
    portNumber: "2999"
};
var sample_stream = streamDevTools.createStreamNode(configJSON);
var DisplaySettings0 = [{name: 'simple', value: 1}, {name: 'detailed', value: 2}],
    DisplaySettings1 = [{name: 'with icons', value: 1}, {name: 'without icons', value: 2}];

var counter = 0, lastUpdated;
setLastUpdated();

/** Update the stream value for all users
 * @returns {null}
 */
function updateAll() {
    sample_stream.retrieveSettings(function (allSettingsObject) {
        //Here we retrieve all the settings from the db.
        /*
        * allSettingsObject = {"...chanelLabel...":{...State Object...},
        *                      "...chanelLabel...":{...State Object...},
*                               ....
        *                       }
        * */
        var pushArray = [];
        for (channelLabel in  allSettingsObject) {
            //Here we iterate through all the settings and 'push' the corresponding information.
            if (allSettingsObject.hasOwnProperty(channelLabel)) {
                sample_stream.push(allSettingsObject[channelLabel], getData(allSettingsObject[channelLabel]));
            }
        }
        //Flush the buffer and send all the information to the cloud.
        sample_stream.pushNow();
    });
}

/** Returns the corresponding String that will be shown on th watch for a set of settings
 * @returns {null}
 */
function getData(settings) {
    var data = '', counterText = " stream instances:", dateText = " last update:";
    if (settings.DataTypeSettings.name.indexOf("Counter") > -1) {
        data = counter;
        if(settings.DisplaySettings0.name.indexOf("detailed") > -1) {
            data += counterText;
        }
    } else {
        data = lastUpdated;
        if(settings.DisplaySettings0.name.indexOf("detailed") > -1) {
            data += dateText;
        }
    }
    if(settings.DisplaySettings0.name.indexOf("without") == -1) {
        return " " + data;
    } else {
        return data;
    }
}

/** Returns the corresponding String that will be shown on th watch for a set of settings
 * @returns {null}
 */
function setLastUpdated(){
    lastUpdated = new Date().getDate() +"." + new Date().getMonth();
}

/** Over-ridden method. Calls the success callback with the desired configuration.
 * @returns {null}
 */
sample_stream.requestConfig = function (resolve, reject) {
    resolve({
        "renderOptions": {
            "DataTypeSettings": {
                "type": "GRID_LAYOUT",
                "dataType": "STATIC",
                "order": 0
            },
            "DisplaySettings0": {
                "type": "INPUT_LIST",
                "dataType": "DYNAMIC",
                "order": 1,
                "asYouType": true,
                "minChars": 3
            },
            "DisplaySettings1": {
                "type": "INPUT_LIST",
                "dataType": "DYNAMIC",
                "order": 2,
                "asYouType": true,
                "minChars": 3
            }
        },
        "settings": {
            "DataTypeSettings": [
                {
                    "name": "Counter",
                    "value": 1
                },
                {
                    "name": "Last Update",
                    "value": 2
                }
            ],
            "DisplaySettings0": [],
            "DisplaySettings1": []
        },
        "defaults": {
            "DataTypeSettings": {
                "name": "Counter",
                "value": 1
            }
        }
    });
};


/** Over-ridden method. Calls the success callback with the found options for the current dynamic setting
 * @returns {null}
 */
sample_stream.requestOptions = function (resolve, reject, settingName, searchTerm, state) {
    var settingItem, results = [];
    switch (settingName) {
        case 'DisplaySettings0':
            settingItem = DisplaySettings0;
            break;
        case 'DisplaySettings1':
            settingItem = DisplaySettings1;
            break;
    }
    settingItem.forEach(function (option) {
        if (option.name.indexOf(searchTerm) > -1) {
            results.push(option);
        }
    });
    resolve(results);
};

/** Over-ridden method. The counter and the lastUpdated variables are updated and the corresponding information is generated and send
 * @returns {null}
 */
sample_stream.registerSettings = function (resolve, reject, settings) {
    counter++;
    resolve(getData(settings));
    setLastUpdated();
};

/** Over-ridden method. The counter and the lastUpdated variables are updated and the corresponding information is generated and send
 * @returns {null}
 */
sample_stream.unregisterSettings = function (resolve, reject, settings) {
    // success
    counter--;
    setLastUpdated();
    resolve();
};

sample_stream.startStreamServer(configJSON.portNumber, function () {
    console.log('Listening on ' + configJSON.portNumber);
    updateAll();
});
setInterval(updateAll, 60 * 60 * 60);

