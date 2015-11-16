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
### [VectorWatch](#VectorWatch)
###### Static Methods
* [createStreamNode](#VectorWatch.createStreamNode)

### [StreamNode](#StreamNode)
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

### [AppNode](#AppNode)
###### Methods
* [getMiddleware](#AppNode.getMiddleware)
* [startAppServer](#AppNode.startAppServer)

###### Events
* [requestConfig](#AppNode.requestConfig)
* [requestOptions](#AppNode.requestOptions)
* [callMethod](#AppNode.callMethod)

<a name="VectorWatch"></a>
## VectorWatch
<a name="VectorWatch.createStreamNode"></a>
> ##### `VectorWatch.createStreamNode`()
> Returns [StreamNode](#push)

<a name="StreamNode"></a>
## StreamNode

<a name="StreamNode.push"></a>
> ##### `.push`([State](#State) `state`, String `data`, Number `delay`)

<a name="StreamNode.pushNow"></a>
> ##### `.pushNow`()

<a name="StreamNode.authTokensForStateExpired"></a>
> ##### `.authTokensForStateExpired`([State](#State) `state`)

<a name="StreamNode.retrieveSettings"></a>
> ##### `.retrieveSettings`(Function `success`, Function `fail`)

<a name="StreamNode.retrieveState"></a>
> ##### `.retrieveState`(Function `success`, Function `fail`)

<a name="StreamNode.getAuthTokensForState"></a>
> ##### `.getAuthTokensForState`([State](#State) `state`, Function `callback`)

<a name="StreamNode.dbCleanUp"></a>
> ##### `.dbCleanUp`(Function `success`, Function `fail`)

<a name="StreamNode.getMiddleware"></a>
> ##### `.getMiddleware`()

<a name="StreamNode.startStreamServer"></a>
> ##### `.startStreamServer`(Number `port`, Function `callback`)

<a name="StreamNode.changeAuthTokensForState"></a>
> ##### `.changeAuthTokensForState`([State](#State) `state`, [AuthTokens](#AuthTokens) `authTokens`)

<a name="StreamNode.registerSettings"></a>
> ##### `.registerSettings`(Function `resolve`, Function `reject`, [State](#State) `settings`, [AuthTokens](#AuthTokens) `authTokens`)

<a name="StreamNode.unregisterSettings"></a>
> ##### `.unregisterSettings`([State](#State) `settings`, [AuthTokens](#AuthTokens) `authTokens`)

<a name="StreamNode.requestConfig"></a>
> ##### `.requestConfig`(Function `resolve`, Function `reject`, [AuthTokens](#AuthTokens) `authTokens`)

<a name="StreamNode.requestOptions"></a>
> ##### `.requestOptions`(Function `resolve`, Function `reject`, String `settingName`, String `searchTerm`, [State](#State) `settings`, [AuthTokens](#AuthTokens) `authTokens`)

<a name="AppNode"></a>
## AppNode
> TODO

<a name="State"></a>
## State
Example:

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
## Config
Example:

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