var fs = require('fs'),
	_ = require('lodash'),
	useragent = require('express-useragent'),
	Helper = require('./_helper');

/**
 * Application Constants 
 *
 * @type {{SaveInterval: number}}
 */
var Constants = {
	// hourly save interval
	HourlyInterval: 60 * 60 * 1000,
	// daily save interval 24 * 60 * 60 * 1000
	DailyInterval: 24 * 60 * 60 * 1000
};

// Configuration obj
var Config = {
	save: 'hourly',
	mongo: {
		db: 'mongodb://localhost/api-analytics',
		collection: 'data'
	}
};

var init = function (options) {
	_.extend(Config, options);
	
	if (typeof Config.save === 'string') {
		switch (Config.save) {
			case 'hourly':
				Config.SaveInterval = Constants.HourlyInterval;
				break;
			case 'daily':
				Config.SaveInterval = Constants.DailyInterval;
				break;
			default:
				Config.SaveInterval = Constants.DailyInterval;
				break;

		}
	} else if (typeof Config.save === 'number') {
		Config.SaveInterval = Config.save
	} else {
		throw Error('Invalid value for config.save passed');
	}
	
};

/**
 * Initialize
 */
var DataStore = {},
    pageViews = 0;

var initEmptyDbObj = function () {
	DataStore.Browser = {};
	DataStore.Platform = {};
	DataStore.Type = {};
	DataStore.Path = {};
	DataStore.Language = {};
};

initEmptyDbObj();

/**
 * Express Middleware that parses every request
 */
var middleware = function (req, res, next) {

	if (_.include(req.url, ".")) {
		next();
	}

	else {

		if (req.headers['user-agent'] !== undefined) {

			var ua = useragent.parse(req.headers['user-agent']);

			if (req.headers['accept-language'] === undefined) {
				req.headers['accept-language'] = 'unknown';
			}

			function checkType () {
				if (ua.isMobile === true) {
					return 'mobile';
				}
				else {
					return 'desktop';
				}
			}

			records(ua.Browser, ua.Platform, checkType(), req._parsedUrl['path'], req.headers['accept-language'].split(',')[0]);

		}

		next();

	}

};

/**
 * Store request values in data store
 */
function records (browser, platform, type, path, language) {

	DataStore.Browser[browser] = {
		'views': counter(browser, 'Browser')
	};

	DataStore.Platform[platform] = {
		'views': counter(platform, 'Platform')
	};

	DataStore.Type[type] = {
		'views': counter(type, 'Type')
	};

	DataStore.Path[path] = {
		'views': counter(path, 'Path')
	};

	DataStore.Language[language] = {
		'views': counter(language, 'Language')
	};

    DataStore.overall = {
        'views': pageViews++
    };

}

/**
 * Counter
 */
function counter (index, root) {

	if (typeof DataStore[root][index] === 'undefined') {
		return 1;
	} else {
		DataStore[root][index].views++;
		return DataStore[root][index].views++;
	}

}

var _updateStats = function (data) {

    _.forEach(DataStore, function (obj, type) {
        if (type === 'overall') {
            
            data[type].views += obj.views;
            
        } else {
            
            _.forEach(obj, function (o, key) {
                data[type][key].views += o.views;
            });

        }
    });
    
    return data;
};

/**
 * Save and export DataStore object
 *
 * @returns {{}}
 */
var save = function () {
    
    Helper.connectMongo(Config.mongo.db).then(function (dbObj) {

        Helper.getCollection(dbObj, Config.db.collection).then(function (collection) {
            
            var data = _updateStats(collection[0], DataStore);
            
            Helper.updateCollection(dbObj, Config.db.collection, _.clone(data, true));
            
            flush();
        });
    });

};

/**
 * Returns db store that's not stored in mongo
 *
 * @returns {{}}
 */
var getStats = function () {
    return _.clone(DataStore, true);
};

/**
 * Automatically save db object once in every two hours
 */
setInterval(function() {
	save();
}, Config.SaveInterval);

/**
 * Save data periodically
 */
var flush = function() {

	delete DataStore.Browser;
	delete DataStore.Platform;
	delete DataStore.Type;
	delete DataStore.Path;
	delete DataStore.Language;
	
	initEmptyDbObj();
	console.log('Internal Object data store flushed.');

};

module.exports = middleware;
module.exports.save = save;
module.exports.getStats = stats;
module.exports.init = init;