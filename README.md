Npm package for developing VectorWatch streams

Installation and Usage
----------------------

#### Installing stream-dev-tools for Node.js

To install the latest version available on NPM:

    npm install stream-dev-tools


#### Usage

    var sample_stream = require('stream-dev-tools');
    
### Configuration

The developer must set a few things before he can get started:

Properties:

    streamUUID - unique identifier provided by Vector
    streamType - whether the stream would push data to individual users or not
    hasSettings - whether the stream has user settings
    token - provided by Vector
    
Methods:

    registerSettings
    unregisterSettings

