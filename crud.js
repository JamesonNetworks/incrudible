var mongoose = require('mongoose')
var Schema = mongoose.Schema;

var currentModel = {};
var currentMethod = {};
var currentResponse = {};
var currentObject = {};

var status = {};
var message = {};

// Set up promises for DB loads
var promise = new mongoose.Promise;
var callback = function(object) {
	if(object.length == 0) {
		message = JSON.stringify({status : "not_found"});
		done(message);
	}
	else {
		message = JSON.stringify(object);
		done(message);
	}
}
var errback = function(object) {
	message = 'Database save error, Err:' + JSON.stringify(object);
	throw new Error(message);
	done(message);
}
//Add mongoose callbacks
promise.addCallback(callback);
promise.addErrback(errback);

// Save success message generator
function SAVE_SUCCESS(object) { 
	return { status: "success", message: "The " + object.structure + " has been successfully saved"};
};

//Private helper functions
function loadFromModel() {
	mongoose.connection.once('open', function (res) {
		currentModel.find({ id: object.id}, function(err, object) {
			if(err) {
				promise.error(err);
				return;
			}
			promise.complete(object);
		}).exec();
	});
}

function saveUsingModel() {
	// Populate the fields in the model
	for(var item in object) {
		if(currentModel.hasOwnProperty(item)) {
			currentModel[item] = object[item];
		}
		else {
			throw new Error('The model did not have properties in the object');
		}
	}

	mongoose.connection.once('open', function () {
		currentModel.save(function (err) {
			if(err) {
				message = 'Creation Error, Err:' + JSON.stringify(err);
				throw new Error(message);
				done(message);
			}
			else {
				message = SAVE_SUCCESS(object);
				done(message);
			}
		})
	})
}

function done(message, object) {
	mongoose.disconnect();
	if(object === null) {
		if(returnToCallback) {
			response(message);
		}
		else {
			response.writeHead(200, '{ Content-Type : application/json }');
			response.write(message);
			response.end();
		}
	}
	else {
		if(returnToCallback) {
			response(message);
		}
		else {
			response.writeHead(200, '{ Content-Type : application/json }');
			response.write(message);
			response.end();
		}
	}
}

// This accepts a database connection string, a mongoose model, the object to save,
// and a response object. If the response object is an express response object, the
// model will be saved and the response outputted to the response. If the response 
// is a callback, the message will be sent to the callback.
module.exports = function crud(dbConnectString, mongooseModel, object, method, response) {
	// Variables:
	// Whether to return to callback or not
	var returnToCallback = false;

	//Determine if the passed in object is an object or a callback
	if (typeof response === 'function') {
		// We have a function!
		returnToCallback = true;
	}

	// Setup variables for use in save and load
	currentResponse = response;
	currentMethod = method;
	currentModel = mongooseModel;
	currentObject = object;

	// DB logging
	//if(true) { mongoose.set('debug', true); };
	mongoose.connect(dbConnectString, function (err) {
		// if we failed to connect, abort
		if (err) throw err;

		switch(currentMethod) {
			case 'save':
				saveUsingModel();
			break;
			case 'load':
				loadFromModel();
			break;
			case default:
		}
	})
}