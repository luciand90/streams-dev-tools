var StorageProvider = require('../StorageProvider.js'),
    mysql = require('mysql');

var MysqlStorageProvider = function MysqlStorageProvider() {
    StorageProvider.apply(this, arguments);

    this.config.table = this.config.table || 'Settings';
    this.config.keyColumn = this.config.keyColumn || 'key';
    this.config.valueColumn = this.config.valueColumn || 'value';
    this.config.countColumn = this.config.countColumn || 'count';

    if (this.config.connection) {
        this.db = this.config.connection;
    } else {
        this.db = mysql.createConnection({
            host: this.config.host,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database
        });
    }
};

MysqlStorageProvider.prototype = Object.create(StorageProvider.prototype);

MysqlStorageProvider.prototype.store = function(key, value, callback) {
    this.query(
        'INSERT INTO {table} ({keyColumn}, {valueColumn}, {countColumn}) VALUES(?, ?, 1) ' +
        'ON DUPLICATE KEY UPDATE {valueColumn} = VALUES({valueColumn}), {countColumn} = {countColumn} + 1',
        [key, JSON.stringify(value)],
        function (err) {
            callback && callback(err);
        }
    );
};

MysqlStorageProvider.prototype.retrieve = function(key, callback) {
    this.query(
        'SELECT {valueColumn} FROM {table} WHERE {keyColumn} = ?',
        [key],
        function(err, records) {
            if (err) return callback && callback(err);

            callback && callback(null, records[0] && JSON.parse(records[0]));
        }
    );
};

MysqlStorageProvider.prototype.retrieveAll = function(callback) {
    var _this = this;
    this.query(
        'SELECT {keyColumn}, {valueColumn} FROM {table}',
        function(err, records) {
            if (err) return callback && callback(err);

            var storage = { };
            records.forEach(function(record) {
                var key = record[_this.config.keyColumn];
                var value = record[_this.config.valueColumn];

                storage[key] = value && JSON.parse(value);
            });

            callback && callback(null, storage);
        }
    );
};

MysqlStorageProvider.prototype.removeAll = function(callback) {
    this.query('DELETE FROM {table}', function(err) {
        callback && callback(err);
    });
};

MysqlStorageProvider.prototype.remove = function(key, callback) {
    var _this = this;
    this.query(
        'UPDATE {table} SET {countColumn} = {countColumn} - 1 WHERE {keyColumn} = ?',
        [key],
        function(err) {
            if (err) return callback && callback(err);

            _this.query('DELETE FROM {table} WHERE {countColumn} < 1', function(err) {
                callback && callback(err);
            });
        }
    );
};

MysqlStorageProvider.prototype.query = function(query, data, callback) {
    this.db.query(
        query
            .replace(/\{table\}/g, '`' + this.config.table + '`')
            .replace(/\{keyColumn\}/g, '`' + this.config.keyColumn + '`')
            .replace(/\{valueColumn\}/g, '`' + this.config.valueColumn + '`')
            .replace(/\{countColumn\}/g, '`' + this.config.countColumn + '`'),
        data || [], callback
    );
};

module.exports = MysqlStorageProvider;