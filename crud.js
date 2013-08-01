var Db = require('mongodb').Db,
	Server = require('mongodb').Server,
	conf = require('./config.json');

var currentModel = {};
var currentMethod = {};
var currentResponse = {};
var currentObject = {};

var status = {};
var message = {};

var returnToCallback = false;

var db = {};

// Save success message generator
function SAVE_SUCCESS(object) { 
	return { status: "success", message: "The " + object.structure + " has been successfully saved"};
};

//Private helper functions
function loadFromCollection() {
	db.open(function(err, db) {
		if (err) {
        	console.log(err);
    	} 
    	else {
			db.collection(currentObject.structure, function(err, collection) {
				if(err) {
					console.log(err);
				}
				var returnItem;
				if(currentObject.isCollection) {
					if(currentObject.hasParameters) {
						var cursor = collection.find(currentObject.parameters).toArray(function (err, documents) {
			            	if(documents.length > 0) {
			            		done("success", documents);
			            	}
			            	else {
			            		done("not found");
			            	}
			            	db.close();
						});
					}
					else {
						var cursor = collection.find({useruuid: currentObject.useruuid}).toArray(function (err, documents) {
			            	if(documents.length > 0) {
			            		done("success", documents);
			            	}
			            	else {
			            		done("not found");
			            	}
			            	db.close();
						});
					}
				}
				else {
					if(currentObject.hasParameters) {
			            var cursor = collection.find(currentObject.parameters).toArray(function(err, documents) {
			            	if(documents.length > 0) {
			            		done("success", documents);
			            	}
			            	else {
			            		done("not found");
			            	}
			            	db.close();
			            });
					}
					else {
		            	var cursor = collection.find({ id : currentObject.id, useruuid: currentObject.useruuid }).toArray(function(err, documents) {
		            	if(documents.length > 0) {
		            		done("success", documents);
		            	}
		            	else {
		            		done("not found");
		            	}
		            	db.close();
		            });
					}
	            }
			})
		}
	});
}

function saveToCollection() {
	db.open(function(err, db) {
		if (err) {
        	console.log(err);
    	} 
    	else {
			db.createCollection(currentObject.structure, function(err, collection) {
				if(currentObject.constraints) {
					checkConstraints(currentObject, function(results, failed) {
						if(failed) {
							ary = [];
							ary.push(results);
							done("failure", ary);
							db.close();
						}
						else {
							collection.insert(currentObject);
							currentObject.constraints = null;
							ary = [];
							ary.push(currentObject);
							done("success", ary);
							db.close();
						}
					});
				}
				else {
					collection.insert(currentObject);
					ary = [];
					ary.push(currentObject);
					done("success", ary);
					db.close();
				}
			})
		}
	});
}

function deleteFromCollection() {
	db.open(function(err, db) {
		if (err) {
        	console.log(err);
    	} 
    	else {
			db.collection(currentObject.structure, function(err, collection) {
				collection.remove({id : currentObject.id}, function(err) {
					if(err) {
						console.log(err);
					}
					done("success", currentObject);
					db.close();
				});
			})
		}
	});
}

function done(message, object) {
	if(null == object) {
		if(returnToCallback) {
			currentResponse(message);
		}
		else {
			currentResponse.writeHead(200, '{ Content-Type : application/json }');
			currentResponse.write("{ \"message\": \"" + message + "\"}");
			currentResponse.end();
		}
	}
	else {
		if(returnToCallback) {
			currentResponse(message, object);
		}
		else {
			currentResponse.writeHead(200, '{ Content-Type : application/json }');
			currentResponse.write("{ \"message\": \"" + message + "\",");
			currentResponse.write("\"" + object[0].structure + "Container\" : " + JSON.stringify(object) + "}");
			currentResponse.end();
		}
	}
}

function checkConstraints(object, callback) {
	if(object.constraints) {
		var failed = false;
		var constraintCheckResults =[];
		debugger;
		for(var i = 0; i < object.constraints.length; i++) {
			debugger;
			//var check = violatesConstraint(object.constraints[i], object);
			//constraintCheckResults.push({ object.constraints[i].name, check, object) });
			if(constraintCheckResults.last.check == true) {
				failed = true;
			}
		}
		callback(constraintCheckResults, failed);
	}
	else {
		throw new Error("Object does not have any constraints");
	}
}

function violatesConstraint(constraint, object) {
	switch(constraint.name) {
		case 'unique':
			//db.collection(currentObject.structure, function(err, collection) {
			// 	collection.find({constraint["name"]: constraint.key}).toArray(function (err, docs) {
			// 		if(docs.length > 0) {
			// 			return true;
			// 		}
			// 		else {
			// 			return false;
			// 		}
			// 	}
			//});
			//})
			return false;
		break;
		case 'mustHave':
			return false;
		break;
		case 'mustBelongTo':
			return false;
		break;
		default:
			return false;
	}
}

// This accepts a database connection string, a mongoose model, the object to save,
// and a response object. If the response object is an express response object, the
// model will be saved and the response outputted to the response. If the response 
// is a callback, the message will be sent to the callback.
module.exports = function crud(dbName, object, method, response) {
	db = new Db(dbName, new Server(conf.db.host, conf.db.port), {safe:false});
	//Determine if the passed in object is an object or a callback
	if (typeof response === 'function') {
		// We have a function!
		returnToCallback = true;
	}
	else {
		returnToCallback = false;
	}

	// Setup variables for use in save and load
	currentResponse = response;
	currentMethod = method;
	currentObject = object;

	switch(currentMethod) {
		case 'POST':
			saveToCollection();
		break;
		case 'GET':
			loadFromCollection();
		break;
		case 'DELETE':
			deleteFromCollection();
		break;
		default:
			throw new Error('Unsupported method');
	}
}

