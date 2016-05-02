// server.js
// Author: Christian Hughes
// Course: CIS 526 - Kansas State University
// Professor: Nathan Bean

"use strict";

var querystring = require('querystring'),
    http = require('http'),
    fs = require('fs'),
    formidable = require('formidable'),
    util = require('util'),
    cssData,
    currentDir,
    currentName,
    currentGalleryConfig,
    config;

cssData = fs.readFileSync("gallery.css", {"encoding":"utf-8"});
config = JSON.parse(fs.readFileSync("config.json", {"encoding":"utf-8"}));

// Save a configuration file at the given file path. Requires an object to be converted into JSON.
function saveConfig(path, objectToStringify) {
  var data = JSON.stringify(objectToStringify);
  fs.writeFile("./" + path + "config.json", data, function(err){
    if(err) console.error("Error saving configuration", err)
  });
}

// Serve the gallery HTML, or the gallery photos. Depends on the request.
function serveGalleryResource(req, res, path) {
  var resourceList = path.split('/');
  var galleryName = resourceList[1];
  currentName = resourceList[1];
  var galleryDir = "";
  // Get the directory of the gallery at the given path.
  for (var i = 0; i < config.Galleries.length; i++)
  {
    if (galleryName == config.Galleries[i].gallery)
    {
      currentDir = config.Galleries[i].dirName;
      galleryDir = config.Galleries[i].dirName;
      break;
    }
  }
  // If no galleryDir name was found, then display the 404 page...
  if (galleryDir == "")
  {
    //DISPLAY 404 PAGE.
    res.statusCode = 404;
    var notFoundData = fs.readFileSync("not_found.html", { encoding: "utf-8"});
    res.end(notFoundData);
    return;
  }
  // If the user is looking for a photo, return the photo.
  if (resourceList[2])
  {
    fs.readFile(galleryDir + "/" + resourceList[2], function(err, file) {
      if(err) {
        console.error("Error when attempting to serve image.", err);
        //DISPLAY 404 PAGE.
        res.statusCode = 404;
        var notFoundData = fs.readFileSync("not_found.html", { encoding: "utf-8"});
        res.end(notFoundData);
        return;
      }
      res.writeHead(200, {'content-type': 'text/' + resourceList[1].last });
      res.end(file);
    });
    return;
  }

  currentGalleryConfig = JSON.parse(fs.readFileSync(galleryDir + "/config.json", {"encoding":"utf-8"}));
  var imageTags = "";
  for (var i = 0; i < currentGalleryConfig.Images.length; i++)
  {
    imageTags += "<div>\n";
    imageTags += "<img src='" + galleryName + "/" + currentGalleryConfig.Images[i].filename +"'/>\n";
    imageTags += "<p>" + currentGalleryConfig.Images[i].caption + "</p>\n";
    imageTags += "</div>\n"
  }

  // Serve the HTML and images.
  // Show the index page
  res.writeHead(200, {'content-type': 'text/html'});
  res.end(
    '<!doctype html>\n' +
    '<html>\n' +
    '  <head>\n' +
    '    <title>The ' + currentGalleryConfig.gallery + ' Gallery</title>\n' +
    '    <link href="gallery.css" type="text/css" rel="stylesheet"/>' +
    '  </head>\n' +
    '  <body>\n' +
    '    <h1>The ' + currentGalleryConfig.gallery + ' Gallery</h1>\n' +
          imageTags +
          '<hr>' +
    '      <h3>Upload a new Photo & Caption</h3>\n' +
    generateUploadForm() +
    '  </body>\n' +
    '</html>\n'
  );


};

function generateForm() {
  return '<form action="/" method="POST">' +
    '<label>Gallery Title:</label>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
    '<input type="text" size="50" name="gallery" required/><br><br>' +
    '<label>Gallery Description:</label>' +
    '<input type="text" size="50" name="desc" required/><br><br>' +
    '<input type="submit" value="Create Gallery"/>' +
    '</form>';
}

function generateUploadForm() {
  return '<form action="/upload" method="post" enctype="multipart/form-data">'+
  '<input type="file" name="upload" multiple="multiple"><br><br>'+
  '<label>Caption:</label>' +
  '<input type="text" size="50" name="caption" required/><br><br>' +
  '<input type="submit" value="Upload">'+
  '</form><br>' +
  '<p><i>In order to see your upload, you may need to refresh the page</i></p>';
}

function serveIndex(req, res, postedData) {

  // If the user just submitted a form, then a new gallery must be created.
  if (postedData && postedData.gallery && postedData.desc)
  {
    // Add the new gallery to the array of galleries.
    postedData.dirName = "gallery" + config.currentOpenDirectoryNumber;
    config.Galleries.push(postedData);
    // Make a new directory for the new gallery.
    fs.mkdirSync('./gallery' + config.currentOpenDirectoryNumber);
    // Increase the current directory number so the next file can have a new unique name.
    config.currentOpenDirectoryNumber++;
    // Save the index config file.
    saveConfig("", config);

    // Create a config for the new directory.
    var newConfig = { gallery: postedData.gallery, desc: postedData.desc, Images: []};
    saveConfig(postedData.dirName + "/", newConfig);
  }

  // Create anchor tags out of all of the current galleries.
  var anchorTagsAndDescriptions = "";
  for (var i = 0; i < config.Galleries.length; i++)
  {
    anchorTagsAndDescriptions += "<p>Go to the <a href='/" + config.Galleries[i].gallery + "'><b>" + config.Galleries[i].gallery + "</b></a> gallery!";
    anchorTagsAndDescriptions += " - <i>" + config.Galleries[i].desc + "</i></p>\n";
  }

    // Show the index page
    res.writeHead(200, {'content-type': 'text/html'});
    res.end(
      '<!doctype html>\n' +
      '<html>\n' +
      '  <head>\n' +
      '    <title>' + config.title + '</title>\n' +
      '    <link href="gallery.css" type="text/css" rel="stylesheet"/>' +
      '  </head>\n' +
      '  <body>\n' +
      '    <h1>' + config.title + '</h1>\n' +
      '      <h3>\n' +
                "Available Galleries" +
      '      </h3>\n' +
            anchorTagsAndDescriptions +
            '<hr>' +
      '      <h3>Create a New Gallery</h3>\n' +
      generateForm() +
      '  </body>\n' +
      '</html>\n'
    );
}

// Serve up our CSS file.
function serveCSS(req, res) {
  res.writeHead(200, {'content-type':'text/css'});
  res.end(cssData);
}

// Uses the callback pattern. Processes data, then passes it off to another function.
function parsePostData(req, res, callback) {
  if(req.method.toUpperCase() != "POST") return callback(req, res);
  var body = '';

  req.on('data', function(data) {
    body += data;
    // Protect against huge file uploads
    if(body.length > config.maxUploadSizeInMB * Math.pow(10,6))
      req.connection.destroy();
  });

  req.on('end', function(){
    var data = querystring.parse(body);
    callback(req, res, data);
  });
}

// Create a new server.
var server = new http.Server(function(req, res) {

  if (req.url == '/upload' && req.method.toLowerCase() == 'post') {

   // creates a new incoming form.
   var form = new formidable.IncomingForm();

   form.on('fileBegin', function(name, file) {
        file.path = './' + currentDir + '/' + file.name;
    });

    form.parse(req, function(err, fields, files) {
          currentGalleryConfig.Images.push({"filename": files.upload.name, "caption": fields.caption });
          saveConfig(currentDir + "/", currentGalleryConfig);
    });

   // parse a file upload
   res.writeHead(302, {'Location': './' + currentName});
   res.end();
   return;
    };

  // Get the resource string without the query.
  var resource = req.url.split("?")[0];
  switch(resource) {
    case "/index":
    case "/index.html":
    case "/":
      parsePostData(req, res, serveIndex);
      break;
    case "/gallery.css":
      serveCSS(req, res);
      break;
    default:
      serveGalleryResource(req, res, resource);
      break;
  }
}).listen(8080);
