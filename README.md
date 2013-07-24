incrudible
==========

CRUD Boiler Plate for Node JS

This is a library I'm writing to assist in creating easy to use REST services with a 
database backend. Essentially it will take an object and either a callback function
or an express response object. Using the callback function gives the consumer a 
chance to see the object they get, whereas passing the response object will cause
a message and/or the desired object into the body of the response as JSON.

I'm using it in the following way on my unit tests:
crud = require('incrudible');

manageObject(parameters, type, req, function(message) {
  console.log(message); // Prints message out to log
}

function manageObject(param, type, req, callback) {
    crud(dbName, param, type, callback); // This builds the object
}
