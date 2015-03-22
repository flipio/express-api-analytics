/**
 * Created by filip on 3/21/15.
 */

var MongoClient = require('mongodb').MongoClient;
var Q = require('q');

var Helper = {
	
	//db object cache
	db: null,

    /**
     * Update mongo collection
     *
     * @param db
     * @param collName
     * @param item
     * @returns {promise|*|Q.promise}
     */
    updateCollection: function(db, collName, item) {
		var deferred = Q.defer(),
            collection = db.collection(collName);
        
		collection.update({ _id: item._id }, item, function(err, result) {

			if (err) { deferred.reject(err); }

			deferred.resolve(result);

		});

		return deferred.promise;

	},
    
    getCollection: function (db, collName) {
        var deferred = Q.defer(),
            collection = db.collection(collName);

        collection.find({}).toArray(function (err, items) {
            if (err) {deferred.reject(err);}
            var toDefer = [];

            deferred.resolve(items);

        });
    
        return deferred.promise;
    },

	/**
	 * Connect to mongo
	 *
	 * @param url
	 * @returns {promise|*|Q.promise}
	 */
	connectMongo: function (url) {
		var deferred = Q.defer(),
			_self = this;
		
		if (this.db) {
            deferred.resolve(this.db);
		} else {
			// Use connect method to connect to the Server
			MongoClient.connect(url, function(err, db) {

                if (err) { deferred.reject(err); }

                console.log("Connected correctly to mongo");
				
				_self.db = db;
                deferred.resolve(_self.db);
			});
		}
		
		return deffered.promise;
	}
	
	
};

module.exports = Helper;
