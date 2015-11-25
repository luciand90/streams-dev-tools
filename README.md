Getting started
===


Install the latest version available on NPM:

```sh
npm install stream-dev-tools --save
```
Then:

```javascript
var VectorWatch = require('stream-dev-tools');
```
Streams
-------

### How it works
Streams are text based content that is displayed on the Vector Watch.
From a technical point of view, the system works as follows. The watch exchanges data with the phone application (available on iOS, Android and Windows Phone), the app exchanges data with our cloud and our cloud exchanges data with a stream node.
![Streams Flow](http://i.imgur.com/AsasaqN.png).

The communication between Vector Cloud and a Stream Node is handled using HTTP protocol. The Stream Node listens on a HTTP endpoint to receive Vector events and it calls HTTP endpoints on the Vector Cloud in order to push realtime data to the Vector Watch.

### How to use it
In order to host a stream, you need the API token generated for your developer account and a streamUID which you can create [here](http://example.com/todo).

```javascript
var vectorStream = VectorWatch.createStreamNode({
	token: '***',
	streamUID: '***'
});
```

Listen to [`requestConfig`](#StreamNode.requestConfig) events, triggered when someone drops the stream onto an empty stream slot, creating a stream instance:

```javascript
vectorStream.requestConfig = function(resolve, reject) {
	resolve({
		renderOptions: {
			MySetting: {
				type: 'GRID_LAYOUT',
				dataType: 'STATIC'
			}
		},
		settings: {
			MySetting: [
				{ name: 'Option #1', value: 1 },
				{ name: 'Option #2', value: 2 }
			]
		},
		defaults: {
			MySetting: { value: 1 }
		}
	});
};
```

Listen to [`registerSettings`](#StreamNode.registerSettings) events, triggered when someone configures a stream instance:

```javascript
vectorStream.registerSettings = function(resolve, reject, settings) {
	if (settings.MySetting1 == 1) {
		resolve('Selected Option #1');
	} else if (settings.MySetting1 == 2) {
		resolve('Selected Option #2');
	} else {
		reject(new Error('Invalid option selected.'));
	}
};
```
Apps
----
### How it works
### How to use it

# API Reference
## Summary
### [VectorWatch]
###### Static Methods
* [createStreamNode](#VectorWatch.createStreamNode)

### [StreamNode]
###### Methods
* [push](#StreamNode.push)
* [pushNow](#StreamNode.pushNow)
* [authTokensForStateExpired](#StreamNode.authTokensForStateExpired)
* [retrieveSettings](#StreamNode.retrieveSettings)
* [retrieveState](#StreamNode.retrieveState)
* [getAuthTokensForState](#StreamNode.getAuthTokensForState)
* [dbCleanUp](#StreamNode.dbCleanUp)
* [getMiddleware](#StreamNode.getMiddleware)
* [startStreamServer](#StreamNode.startStreamServer)
* [changeAuthTokensForState](#StreamNode.changeAuthTokensForState)

###### Events
* [registerSettings](#StreamNode.registerSettings)
* [unregisterSettings](#StreamNode.unregisterSettings)
* [requestConfig](#StreamNode.requestConfig)
* [requestOptions](#StreamNode.requestOptions)

### [AppNode]
###### Methods
* [getMiddleware](#AppNode.getMiddleware)
* [startAppServer](#AppNode.startAppServer)

###### Events
* [requestConfig](#AppNode.requestConfig)
* [requestOptions](#AppNode.requestOptions)
* [callMethod](#AppNode.callMethod)

<a name="VectorWatch"></a>
## VectorWatch : Object
#### Methods
<a name="VectorWatch.createStreamNode"></a>

- `VectorWatch.createStreamNode`([Config] `options`) &rarr; [StreamNode]

<a name="StreamNode"></a>
## StreamNode : Object
#### Properties
- `stateStorage`
- `authStorage`

#### Methods
- <a name="StreamNode.push"></a>`.push`([State] `state`, [String] `data`, [Number]`delay`) &rarr; [StreamNode]
```
This method will put the 'data' String for the given channel(state) in the cache object and send it 
to the cloud after the delay has passed.
After that all the users that listen to that channel will see the new information.
```
##### Example:
```javascript
stream.push({channelLabel:"....", settings1:{name:"...", value:""}}, "Info to be shown", 1);
```
- <a name="StreamNode.pushNow"></a>`.pushNow`() &rarr; [StreamNode]
```
This method will flush the cache and send all the information to the cloud.
```

- <a name="StreamNode.authTokensForStateExpired"></a>`.authTokensForStateExpired`([State] `state`) &rarr; [StreamNode]
```
This method will inform the mobile app that the user's authentification has expired
```
##### Example:
```javascript
stream.authTokensForStateExpired({channelLabel:"....", __auth:{....},settings1:{name:"...", value:""}});
```
- <a name="StreamNode.retrieveSettings"></a>`.retrieveSettings`([Function]<[State]\[\]> `success`, [Function]<[Error]> `fail`) &rarr; `undefined`
```
Get all the settings stored in the DB. On success the resolve(settingsArray) method is called, 
otherwise the reject(error) method.
The developer can access the returned array in the resolve(settingsArray) callback, as a parameter.
```
##### Example:
```javascript
stream.retrieveSettings(function (allSettingsObject) {
	//Do something on success
}, function(){
	//Do something on failure
});
```
- <a name="StreamNode.retrieveState"></a>`.retrieveState` alias of [`.retrieveSettings`](#StreamNode.retrieveSettings)

- <a name="StreamNode.getAuthTokensForState"></a>`.getAuthTokensForState`([State] `state`, [Function]<[Error], [AuthTokens]> `callback`) &rarr; `undefined`
```
Get the authentification information for the given 'state'
```
- <a name="StreamNode.dbCleanUp"></a>`.dbCleanUp`([Function] `success`, [Function]<[Error]> `fail`) &rarr; `undefined`
```
Delete al settings from the DB.
```
- <a name="StreamNode.getMiddleware"></a>`.getMiddleware`() &rarr; [Function]<[Request], [Response], [Function]>
```
Returns the configurated expressJS app
```

- <a name="StreamNode.startStreamServer"></a>`.startStreamServer`([Number] `port`, [Function] `callback`) &rarr; `undefined`

- <a name="StreamNode.changeAuthTokensForState"></a>`.changeAuthTokensForState`([State] `state`, [AuthTokens] `authTokens`) &rarr; `undefined`
```
Inserts/Updates the authentification information in the db/memory
```

#### Events (overridable methods)
- <a name="StreamNode.requestConfig"></a>`.requestConfig`([Function] `resolve`, [Function] `reject`, [AuthTokens] `authTokens`)

```javascript
/** This method is called in order to retrieve all the settings(name, order, display option) when 
an user adds the stream to a watch-face.
 * Call the resolve() method with a Config Object as a parameter for success or the reject() method 
 with an error message.
 */
stream.requestConfig = function (resolve, reject, authTokens) {
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
            ]
        },
        "defaults": {
            "DataTypeSettings": {
                "name": "Counter",
                "value": 1
            }
        }
    });
};
```
- <a name="StreamNode.requestOptions"></a>`.requestOptions`([Function] `resolve`, [Function] `reject`, [String] `settingName`, [String] `searchTerm`, [State] `settings`, [AuthTokens] `authTokens`)

```javascript
/** This method is called in order to retrieve all the options for a particular setting(given by the settingName parameter).
 *  Call the resolve() method with an array of SettingValue objects for success or the reject() method with an error message.
 *  The state parameter holds all the previous settings
 */
stream.requestOptions = function (resolve, reject, settingName, searchTerm, state, authTokens) {
    resolve([{name:"Option0"},{name:"Options1"}]);

};
```
- <a name="StreamNode.registerSettings"></a>`.registerSettings`([Function] `resolve`, [Function] `reject`, [State] `settings`, [AuthTokens] `authTokens`)

```javascript
/** This method is called every time a user selects the desired settings.
 * The DB(if not in dev mode) is automatically updated.
 * When implementing this method the developer must call the 'resolve' function parameter 
 after he retrieves/generates the data.
 * */
stream.registerSettings = function (resolve, reject, settings) {
    resolve("Welcome!");
};
```
- <a name="StreamNode.unregisterSettings"></a>`.unregisterSettings`([Function] `resolve`, [Function] `reject`, [State] `settings`, [AuthTokens] `authTokens`)

```javascript
/** This method is called every time a user removes the stream from a watch-face.
 * */
stream.unregisterSettings = function (resolve, reject, settings) {
    resolve();
};
```


<a name="AppNode"></a>
## AppNode : Object
> TODO

<a name="State"></a>
## State : Object
#### Properties
- `__auth` [Object] \(for internal use only)
- `channelLabel` [String] \(optional)
- `{setting name}` [SettingValue] \(there is a property for each setting)

#### Example:

```json
{
	"__auth": {
		"code": "...",
		"state": "..."
	},
	"MySetting1": { "value": "2" },
	"MySetting2": { "value": "1" },
	"channelLabel": "..."
}
```

<a name="Config"></a>
## Config : Object
This object tells the phone application what are the stream settings and how to display them

- `renderOptions` [Object]<[String], [RenderOption]>
- `settings` [Object]<[String], [SettingValue][]>
- `defaults` [Object]<[String], [SettingValue]>

#### Example

```json
{
	"renderOptions": {
		"MySetting1": {
			"type": "GRID_LAYOUT",
			"hint": "Select an option for MySetting1",
			"order": 0,
			"dataType": "STATIC"
		},
		"MySetting2": {
			"type": "INPUT_LIST_STRICT",
			"hint": "Type an option for MySetting2",
			"order": 1,
			"dataType": "STATIC"
		}
	},
	"settings": {
		"MySetting1": [
			{ "name": "Option #1", "value": "1" },
			{ "name": "Option #2", "value": "2" }
		],
		"MySetting2": [
			{ "name": "Option #1", "value": "1" },
			{ "name": "Option #2", "value": "2" }
		]
	},
	"defaults": {
		"MySetting1": { "value": "1" },
		"MySetting2": { "value": "1" }
	}
}
```

<a name="RenderOption"></a>
## RenderOption : Object
#### Properties
- `name` [String] \(can be omitted if this in the value of a property with the same name)
- `type` [String] \(one of the following: `GRID_LAYOUT`, `INPUT_LIST` or `INPUT_LIST_STRICT`)
- `hint` [String] \(optional)
- `order` [Number] \(required if more than a [RenderOption] is specified)
- `dataType` [String] \(one of the following: `STATIC` or `DYNAMIC`)
- `asYouType` [Boolean] \(required if `dataType` is `DYNAMIC`)
- `minChars` [Number] \(required if `asYouType` is `true`)

#### Example

```json
{
	"type": "GRID_LAYOUT",
	"dataType": "STATIC"
}
```

<a name="SettingValue"></a>
## SettingValue : Object
#### Properties
- `name` [String] \(can be omitted if this is the value of a property with the same name)
- `value` [Object] \(can be anything, but most of the times this will be [String])

#### Example

```json
{
	"name": "Option #1",
	"value": "1"
}
```

<a name="AuthTokens"></a>
## AuthTokens : Object
This class holds the tokens required for authorization.
> This class is abstract, see [OAuth1Tokens] and [OAuth2Tokens] for concrete implementations.

<a name="OAuth1AuthTokens"></a>
## OAuth1Tokens : AuthTokens
#### Properties
- `oauth_access_token` [String]
- `oauth_access_token_secret` [String]

#### Example

```json
{
	"oauth_access_token": "...",
	"oauth_access_token_secret": "..."
}
```

<a name="OAuth2AuthTokens"></a>
## OAuth2Tokens : AuthTokens
#### Properties
- `access_token` [String]
- `refresh_token` [String] \(optional)

#### Example

```json
{
	"access_token": "..."
}
```

#Sample
This is a simple stream that shows the current number of stream instances or the last update(month.year).

```javascript
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
```

[String]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
[Number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number
[Function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function
[Request]: https://nodejs.org/api/http.html#http_http_incomingmessage
[Response]: https://nodejs.org/api/http.html#http_class_http_serverresponse
[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[Boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean
[StreamNode]: #StreamNode
[Config]: #Config
[State]: #State
[AuthTokens]: #AuthTokens
[OAuth1Tokens]: #OAuth1Tokens
[OAuth2Tokens]: #OAuth2Tokens
[SettingValue]: #SettingValue
[RenderOption]: #RenderOption
[AppNode]: #AppNode
[Error]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
[VectorWatch]: #VectorWatch