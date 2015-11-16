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

- <a name="StreamNode.pushNow"></a>`.pushNow`() &rarr; [StreamNode]

- <a name="StreamNode.authTokensForStateExpired"></a>`.authTokensForStateExpired`([State] `state`) &rarr; [StreamNode]

- <a name="StreamNode.retrieveSettings"></a>`.retrieveSettings`([Function]<[State]\[\]> `success`, [Function]<[Error]> `fail`) &rarr; `undefined`

- <a name="StreamNode.retrieveState"></a>`.retrieveState` alias of [`.retrieveSettings`](#StreamNode.retrieveSettings)

- <a name="StreamNode.getAuthTokensForState"></a>`.getAuthTokensForState`([State] `state`, [Function]<[Error], [AuthTokens]> `callback`) &rarr; `undefined`

- <a name="StreamNode.dbCleanUp"></a>`.dbCleanUp`([Function] `success`, [Function]<[Error]> `fail`) &rarr; `undefined`

- <a name="StreamNode.getMiddleware"></a>`.getMiddleware`() &rarr; [Function]<[Request], [Response], [Function]>

- <a name="StreamNode.startStreamServer"></a>`.startStreamServer`([Number] `port`, [Function] `callback`) &rarr; `undefined`

- <a name="StreamNode.changeAuthTokensForState"></a>`.changeAuthTokensForState`([State] `state`, [AuthTokens] `authTokens`) &rarr; `undefined`

#### Events (overridable methods)
- <a name="StreamNode.registerSettings"></a>`.registerSettings`([Function] `resolve`, [Function] `reject`, [State] `settings`, [AuthTokens] `authTokens`)
- <a name="StreamNode.unregisterSettings"></a>`.unregisterSettings`([State] `settings`, [AuthTokens] `authTokens`)
- <a name="StreamNode.requestConfig"></a>`.requestConfig`([Function] `resolve`, [Function] `reject`, [AuthTokens] `authTokens`)
- <a name="StreamNode.requestOptions"></a>`.requestOptions`([Function] `resolve`, [Function] `reject`, [String] `settingName`, [String] `searchTerm`, [State] `settings`, [AuthTokens] `authTokens`)

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
This objects holds the OAuth tokens required for authorization.
#### Properties
- `oauth_access_token` [String] \(only present for the 1.0 protocol version)
- `oauth_access_token_secret` [String] \(only present for the 1.0 protocol version)
- `access_token` [String] \(only present for the 2.0 protocol version)
- `refresh_token` [String] \(optional, only present for the 2.0 protocol version)

#### Example

```json
{
	"oauth_access_token": "...",
	"oauth_access_token_secret": "..."
}
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
[SettingValue]: #SettingValue
[RenderOption]: #RenderOption
[AppNode]: #AppNode
[Error]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
[VectorWatch]: #VectorWatch