// Internal references
var Db = require('mongodb').Db,
	Server = require('mongodb').Server,
	conf = require('./config.json');

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

function done(response, method, object, message, returnToCallback) {
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
				var callback = function() {
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
				};
				// Scrub mongo IDs off objects
				(function(callback) {
					for(var i =0; i < object.length; i++) {
						delete object[i]._id;
						if(i == object.length-1) {
							callback;
						}
					}
				});
			}
		}
	}
}

// Save success message generator
function SAVE_SUCCESS(object) { 
	return { status: "success", message: "The " + object.structure + " has been successfully saved"};
}

var operations = {
	read: function(db, response, method, object, returnToCallback) {
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
		            		done(response, method, documents, "success", returnToCallback);
		            	}
		            	else {
		            		done(response, method, null, "not found", returnToCallback);
		            	}
		            	db.close();
					});
				}
				else {
					var cursor = collection.find({
						userUuid: object.userUuid,
						deleted:{$exists:false} 
						}).toArray(function (err, documents) {
		            	if(documents.length > 0) {
		            		done(response, method, documents, "success", returnToCallback);
		            	}
		            	else {
		            		done(response, method, null, "not found", returnToCallback);
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
		            		done(response, method, documents, "success", returnToCallback);
		            	}
		            	else {
		            		done(response, method, null, "not found", returnToCallback);
		            	}
		            	db.close();
		            });
				}
				else {
	            	var cursor = collection.find({ 
	            		id : object.id, 
	            		userUuid: object.userUuid,
	            		deleted:{$exists:false}
	            		}).toArray(function(err, documents) {
	            	if(documents.length > 0) {
	            		done(response, method, documents, "success", returnToCallback);
	            	}
	            	else {
	            		done(response, method, object, "not found", returnToCallback);
	            	}
	            	db.close();
	            });
				}
            }
		})
	},

	create: function(db, response, method, object, returnToCallback) {
		db.createCollection(object.structure, function(err, collection) {
			if(err) {
				ary = [];
				ary.push(err);
				done(response, method, ary, "failure", returnToCallback);
				db.close();
			}
			else {
				collection.insert(object, function(err) {
					if(err) {
						switch(err.code) {
							case 11000:
								ary = [];
								ary.push({structure: "error", message: "A duplicate entry exists" });
								done(response, method, ary, "failure", returnToCallback);
								db.close();
							break;
							default:
								console.error("A database error has occured: " + JSON.stringify(err));
								ary = [];
								ary.push({structure: "error"});
								done(response, method, ary, "failure", returnToCallback);
						}
					}
					else {
						ary = [];
						ary.push(object);
						done(response, method, ary, "success", returnToCallback);
						db.close();
					}
				});
			}
		})
	},

	delete: function(db, response, method, object, returnToCallback) {
		if(object.isCollection) {
			if(object.hasParameters) {
				db.collection(object.structure, function(err, collection) {
					collection.find(object.parameters).toArray(function(err, documents) {
						for(var i=0; i<documents.length; i++) {
							documents[i].deleted = true;
							collection.save(documents[i], function(err) {
								if(err) {
									console.log(err);
								}
							});
							if(i == documents.length-1) {
								done(response, method, null, "success", returnToCallback);
								db.close();
							}
						}
					});
				});
			}
		}
		else {
			if(object.hasParameters) {
				db.collection(object.structure, function(err, collection) {
					collection.update(object.parameters,
					{
						$set: { deleted: true },
					}, function(err) {
						if(err) {
							console.log(err);
						}
						done(response, method, null, "success", returnToCallback);
						db.close();
					});
				})
			}
			else {
				db.collection(object.structure, function(err, collection) {
					collection.update({uuid: object.uuid},
					{
						$set: { deleted: true },
					}, function(err) {
						if(err) {
							console.log(err);
						}
						done(response, method, null, "success", returnToCallback);
						db.close();
					});
				})
			}
		}
	},

	update: function(db, response, method, object, returnToCallback) {
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
					done(response, method, object, "success", returnToCallback);
					db.close();
				});
			})
		}
		else {
			done(response, method, null, "failure, no params", returnToCallback);
			db.close();
		}	
	}
}

// This accepts a database connection string, a mongoose model, the object to save,
// and a response object. If the response object is an express response object, the
// model will be saved and the response outputted to the response. If the response 
// is a callback, the message will be sent to the callback.
module.exports = function crud(dbName, object, method, response) {
	var db = new Db(dbName, new Server(conf.db.host, conf.db.port), {safe:true});
	db.open(function(err, openDb) {
		if(err) {
			console.log('ERR, There was a problem connecting to the database')
		}
		else {
			var returnToCallback;
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
					operations.create(openDb, response, method, object, returnToCallback);
				break;
				case 'GET':
					operations.read(openDb, response, method, object, returnToCallback);
				break;
				case 'DELETE':
					operations.delete(openDb, response, method, object, returnToCallback);
				break;
				case 'PUT':
					operations.update(openDb, response, method, object, returnToCallback);
				break;
				default:
					throw new Error('Unsupported method');
			}
		}
	});
}