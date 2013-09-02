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
function loadFromCollection(response, method, object) {
	db.open(function(err, db) {
		if (err) {
        	console.log(err);
    	} 
    	else {
			db.collection(object.structure, function(err, collection) {
				if(err) {
					console.log(err);
				}
				var returnItem;
				if(object.isCollection) {
					if(object.hasParameters) {
						object.parameters.deleted = {$exists:false};
						var cursor = collection.find(object.parameters).toArray(function (err, documents) {
			            	if(documents.length > 0) {
			            		done(response, method, documents, "success");
			            	}
			            	else {
			            		done(response, method, null, "not found");
			            	}
			            	db.close();
						});
					}
					else {
						var cursor = collection.find({
							useruuid: object.useruuid,
							deleted:{$exists:false} 
							}).toArray(function (err, documents) {
			            	if(documents.length > 0) {
			            		done(response, method, documents, "success");
			            	}
			            	else {
			            		done(response, method, null, "not found");
			            	}
			            	db.close();
						});
					}
				}
				else {
					if(object.hasParameters) {
						object.parameters.deleted = {$exists:false};
			            var cursor = collection.find(object.parameters).toArray(function(err, documents) {
			            	if(documents.length > 0) {
			            		done(response, method, documents, "success");
			            	}
			            	else {
			            		done(response, method, null, "not found");
			            	}
			            	db.close();
			            });
					}
					else {
		            	var cursor = collection.find({ 
		            		id : object.id, 
		            		useruuid: object.useruuid,
		            		deleted:{$exists:false}
		            		}).toArray(function(err, documents) {
		            	if(documents.length > 0) {
		            		done(response, method, documents, "success");
		            	}
		            	else {
		            		done(response, method, object, "not found");
		            	}
		            	db.close();
		            });
					}
	            }
			})
		}
	});
}

function saveToCollection(response, method, object) {
	db.open(function(err, db) {
		if (err) {
        	console.log(err);
    	} 
    	else {
			db.createCollection(object.structure, function(err, collection) {
				if(err) {
					ary = [];
					ary.push(err);
					done(response, method, ary, "failure");
					db.close();
				}
				else {
					collection.insert(object, function(err) {
						if(err) {
							switch(err.code) {
								case 11000:
									ary = [];
									ary.push({structure: "error", message: "A duplicate entry exists" });
									done(response, method, ary, "failure");
									db.close();
								break;
								default:
									console.error("A database error has occured: " + JSON.stringify(err));
									ary = [];
									ary.push({structure: "error"});
									done(response, method, ary, "failure");
							}
						}
						else {
							ary = [];
							ary.push(object);
							done(response, method, ary, "success");
							db.close();
						}
					});
				}
			})
		}
	});
}

function deleteFromCollection(response, method, object) {
	db.open(function(err, db) {
		if (err) {
        	console.log(err);
    	} 
    	else {
    		if(object.isCollection) {
				if(object.hasParameters) {
					db.collection(object.structure, function(err, collection) {
						collection.update(object.parameters, {
							$set: { 'deleted': true },
						}, function(err) {
							if(err) {
								console.log(err);
							}
							done(response, method, null, "success");
							db.close();
						});
					});
				}
			}
			else {
				if(object.hasParameters) {
					debugger;
					db.collection(object.structure, function(err, collection) {
						collection.update(object.parameters,
						{
							$set: { 'deleted': true },
						}, function(err) {
							if(err) {
								console.log(err);
							}
							done(response, method, null, "success");
							db.close();
						});
					})
				}
				else {
					debugger;
					db.collection(object.structure, function(err, collection) {
						collection.update({uuid: object.uuid},
						{
							$set: { 'deleted': true },
						}, function(err) {
							if(err) {
								console.log(err);
							}
							done(response, method, null, "success");
							db.close();
						});
					})
				}
			}
		}
	});
}

function getFieldToUpdate(object) {
	var returnObject = {};
	switch(object.field) { 
	case 'processed':
		returnObject.processed = true;
		return returnObject;
	case 'metadata':
		returnObject.metadata = object.metadata;
		return returnObject;
	break;
	default:
		console.log('ERR, Error in updating, no valid fields to update were passed');
		return {};
	}
}

function updateInCollection(response, method, object) {
	db.open(function(err, db) {
		if (err) {
        	console.log(err);
    	} 
    	else {
    		if(object.hasParameters) {
				db.collection(object.structure, function(err, collection) {
					var field = getFieldToUpdate(object);
					collection.update(object.parameters,
					{
						$set: field
					}, function(err) {
						if(err) {
							console.log(err);
						}
						done(response, method, object, "success");
						db.close();
					});
				})
    		}
    		else {
    			done(response, method, null, "failure, no params");
    			db.close();
    		}
    	}
    });
}

function done(response, method, object, message) {
	if(null == object) {
		if(returnToCallback) {
			response(message);
		}
		else {
			response.writeHead(200, '{ Content-Type : application/json }');
			response.write("{ \"message\": \"" + message + "\"}");
			response.end();
		}
	}
	else {
		if(returnToCallback) {
			if(message != null && object != null) {
				response(message, object);
			}
			else {
				//Do nothing
			}
		}
		else {
			if(response != null) {
				response.writeHead(200, '{ Content-Type : application/json }');
				response.write("{ \"message\": \"" + message + "\",");
				if(object[0] != null && 'structure' in object[0]) {
					response.write("\"" + object[0].structure + "Container\" : " + JSON.stringify(object) + "}");
				}
				else {
					console.log('ERR, Structure not found in object: ' + JSON.stringify(object));
					response.write("\"" + object[0] + "Container\" : " + JSON.stringify(object) + "}");
				}
				response.end();
			}
		}
	}
}

// This accepts a database connection string, a mongoose model, the object to save,
// and a response object. If the response object is an express response object, the
// model will be saved and the response outputted to the response. If the response 
// is a callback, the message will be sent to the callback.
module.exports = function crud(dbName, object, method, response) {
	db = new Db(dbName, new Server(conf.db.host, conf.db.port), {safe:true});
	//Determine if the passed in object is an object or a callback
	if (typeof response === 'function') {
		// We have a function!
		returnToCallback = true;
	}
	else {
		returnToCallback = false;
	}

	// // Setup variables for use in save and load
	// currentResponse = response;
	// currentMethod = method;
	// currentObject = object;

	//response, method, object

	switch(method) {
		case 'POST':
			saveToCollection(response, method, object);
		break;
		case 'GET':
			loadFromCollection(response, method, object);
		break;
		case 'DELETE':
			deleteFromCollection(response, method, object);
		break;
		case 'PUT':
			updateInCollection(response, method, object);
		break;
		default:
			throw new Error('Unsupported method');
	}
}

