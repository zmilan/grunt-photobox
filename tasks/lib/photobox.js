/*
 * grunt-photoBox
 * https://github.com/stefan/grunt-photoBox
 *
 * Copyright (c) 2013 stefan judis
 * Licensed under the MIT license.
 */

var fs           = require( 'fs' ),
    path         = require( 'path' ),
    phantomjs    = require( 'phantomjs' ),
    phantomPath  = phantomjs.path;


'use strict';


/**
 * Constructor for PhotoBox
 *
 * @param  {Object}   grunt    grunt
 * @param  {Object}   options  plugin options
 * @param  {Function} callback callback
 *
 * @tested
 */
var PhotoBox = function( grunt, options, callback ) {
  this.callback          = callback;
  this.diffCount         = 0;
  this.grunt             = grunt;
  this.options           = options;
  this.options.indexPath = this.getIndexPath();
  this.pictureCount      = 0;
  this.template          = options.useImageMagick ? 'magic' : 'default';

  this.movePictures();
  this.pictures = this.getPreparedPictures();
};


/**
 * Callback for image comparision
 *
 * @param  {String} err     error
 * @param  {Object} result  result
 * @param  {Number} code    exit code
 * @param  {String} picture name of current picture iteration
 */
PhotoBox.prototype.compareCallback = function( err, result, code, picture ) {
  if ( err ) {
    this.grunt.log.error( err );
  }

  this.grunt.log.verbose.writeln(
    'CompareCallback: Result for ' + picture + ' was ' + result
  );
  this.grunt.log.verbose.writeln(
    'CompareCallback: Code for ' + picture + ' was ' + code
  );

  this.grunt.util.spawn( {
    cmd  : 'composite',
    args : this.getCompositArguments( picture )
  }, function( err, code, result ) {
    this.overlayCallback( err, code, result, picture );
  }.bind( this ) );

}


/**
 * Callback for image overlay operation
 *
 * @param  {String} err     error
 * @param  {Object} result  result
 * @param  {Number} code    exit code
 * @param  {String} picture name of current picture iteration
 *
 * @tested
 */
PhotoBox.prototype.overlayCallback = function( err, result, code, picture ) {
  if ( err ) {
    this.grunt.log.error( err );
  } else {
    this.grunt.log.ok( 'diff for ' + picture + ' generated.' );
  }

  this.grunt.log.verbose.writeln(
    'OverlayCallback: Result for ' + picture + ' was ' + result
  );
  this.grunt.log.verbose.writeln(
    'OverlayCallback: Code for ' + picture + ' was ' + code
  );

  ++this.diffCount;

  this.tookDiffHandler();
}


/**
 * Actuel function to create the diff images
 */
PhotoBox.prototype.createDiffImages = function() {
  var imgPath = this.options.indexPath + 'img/' ;

  this.grunt.log.subhead( 'PHOTOBOX STARTED DIFF GENERATION.')
  this.pictures.forEach( function( picture ) {
    picture = picture.replace( /(http:\/\/|https:\/\/)/, '').replace( /(\/)|(\|)/g, '-');
    this.grunt.log.writeln( 'started diff for ' + picture );

    var oldFileExists = this.grunt.file.exists(
                          this.options.indexPath + 'img/last/' + picture + '.png'
                        );

    var currentFileExists = this.grunt.file.exists(
                              this.options.indexPath + 'img/current/' + picture + '.png'
                            );
    if ( oldFileExists && currentFileExists ) {

      this.grunt.util.spawn( {
        cmd  : 'compare',
        args : this.getCompareArguments( picture )
      }, function( err, result, code ) {
        this.compareCallback( err, result, code, picture )
      }.bind ( this ) );

    } else {
      this.grunt.log.error(
        'Nothing to diff here - no old pictures available.'
      );

      ++this.diffCount;

      this.tookDiffHandler();
    }
  }.bind( this ) );
};


/**
 * Create index file.
 *
 * @tested
 */
PhotoBox.prototype.createIndexFile = function() {
  this.grunt.log.subhead( 'PHOTOBOX STARTED INDEX FILE GENERATION' );

  this.grunt.file.write(
    this.options.indexPath + 'index.html',
    this.grunt.template.process(
      this.grunt.file.read( path.dirname( __dirname ) + '/tpl/' + this.template + '.tpl'),
      { data : {
        pictures   : this.pictures,
        timestamps : this.getTimestamps()
      } }
    )
  );

  this.grunt.log.ok(
    'PHOTOBOX CREATED NEW \'index.html\' AT \'' + this.options.indexPath + '\'.'
  );
};


/**
 * Getter for in constructor set callback function
 * Mostly for testing purposes
 *
 * @return {Function} callback
 */
PhotoBox.prototype.getCallback = function() {
  return this.callback;
};


/**
 * Helper function to evaluate correct path for index file
 *
 * @return {String} indexPath
 *
 * @tested
 */
PhotoBox.prototype.getIndexPath = function() {
  var indexPath = this.options.indexPath;

  if ( !indexPath ) {
    this.grunt.log.error( 'No indexPath set.' );
  }

  if ( indexPath[ indexPath.length - 1 ] !== '/' ) {
    indexPath += '/';
  }

  return indexPath;
};


/**
 * Helper function to build up the arguments
 * array for the compare command
 *
 * @param  {String} picture picture
 * @return {Array}          Array including all arguments
 */
PhotoBox.prototype.getCompareArguments = function( picture ) {
  return [
    '-compose',
    'src',
    '-highlight-color',
    this.options.highlightColor,
    this.options.indexPath + 'img/current/' + picture + '.png',
    this.options.indexPath + 'img/last/' + picture + '.png',
    this.options.indexPath + 'img/diff/' + picture + '-diff.png'
  ];
};


/**
 * Helper function to build up the arguments
 * array for the composit command
 *
 * @param  {String} picture picture
 * @return {Array}          Array including all arguments
 */
PhotoBox.prototype.getCompositArguments = function( picture ) {
  return [
    '-alpha',
    'on',
    this.options.indexPath + 'img/diff/' + picture + '-diff.png',
    this.options.indexPath + 'img/last/' + picture + '.png',
    this.options.indexPath + 'img/diff/' + picture + '.png'
  ];
};


/**
 * Getter for diffCount
 * Mostly for testing purposes
 *
 * @return {Number} pictureCount
 */
PhotoBox.prototype.getDiffCount = function() {
  return this.diffCount;
};


/**
 * Getter for options
 * Mostly for testing purposes
 *
 * @return {Object} options
 */
PhotoBox.prototype.getOptions = function() {
  return this.options;
};


/**
 * Getter for pictureCount
 * Mostly for testing purposes
 *
 * @return {Number} pictureCount
 */
PhotoBox.prototype.getPictureCount = function() {
  return this.pictureCount;
};


/**
 * Getter for pictures array.
 * Mostly for testing purposes
 *
 * @return {Array} pictures
 */
PhotoBox.prototype.getPictures = function() {
  return this.pictures || null;
};


/**
 * Get prepared picture array.
 *
 * @return {Array} Array with concatenated picture information
 *
 * @tested
 */
PhotoBox.prototype.getPreparedPictures = function() {
  var pictures = [];

  this.options.urls.forEach( function( url ) {
    this.options.screenSizes.forEach( function( size ) {
      pictures.push( url + '|' + size );
    } );
  }, this );

  return pictures;
};


/**
 * Get timestampe for given file by reading timestamp.json file
 *
 * @param  {String} name name
 * @return {String}      actual timestamp
 *
 * @tested
 */
PhotoBox.prototype.getTimestamp = function( name ) {
  var timestampContent,
      timestamp;

  try {
    timestampContent = this.grunt.file.read(
                            this.options.indexPath + '/img/' + name + '/timestamp.json'
                          ),

    timestamp = JSON.parse( timestampContent ).timestamp;
  } catch ( e ) {
    this.grunt.log.error(
      'Something went wrong with reading timestamp file for ' + name + ' photosession'
    );

    timestamp = 'Not available';
  }

  return timestamp;
};


/**
 * Get object with current and last timestamps
 *
 * @return {Object} timestamps
 *
 * @tested
 */
PhotoBox.prototype.getTimestamps = function() {
  return {
    current : this.getTimestamp( 'current' ),
    last    : this.getTimestamp( 'last' )
  };
};


/**
 * Move current pictures to latest directory
 *
 * @tested
 */
PhotoBox.prototype.movePictures = function() {
  // delete old images
  if ( this.grunt.file.exists( this.options.indexPath + '/img/last' ) ) {
    this.grunt.file.delete( this.options.indexPath + '/img/last' );
  }

  // delete old diffs
  if ( this.grunt.file.exists( this.options.indexPath + '/img/diff' ) ) {
    this.grunt.file.delete( this.options.indexPath + '/img/diff' );
  }

  // create new diff fole - imageMagick is not able to create it on its own
  this.grunt.file.mkdir( this.options.indexPath + '/img/diff' );

  // move current picture to old pictures
  if ( !this.grunt.file.exists( this.options.indexPath + '/img/current' ) ) {
    this.grunt.log.error(
      'No old pictures are existant. So you can compare kittens with the new pictures.'
    );
  } else {
    fs.renameSync(
      this.options.indexPath + '/img/current',
      this.options.indexPath + '/img/last',
      function( err ) {
        if ( err ) {
          this.grunt.log.error( err );
          this.grunt.verbose.error();
          this.grunt.fail.warn( 'Rename operation failed.' );
        }
      }
    )
  }
};


/**
 * Callback after phantomjs operation
 *
 * @param  {String} err     error
 * @param  {Object} result  result
 * @param  {Number} code    exit code
 * @param  {String} picture name of current picture iteration
 *
 * @tested
 */
PhotoBox.prototype.photoSessionCallback = function( err, result, code, picture ) {
  if ( err ) {
    this.grunt.log.error( 'Takin\' picture of ' + picture + 'did not work correclty...' );
    this.grunt.log.writeln( err );
  } else {
    this.grunt.log.ok( 'picture of ' + picture + ' taken.' );
  }

  this.grunt.log.verbose.writeln(
    'PhotoSessionCallback: Result for ' + picture + ' was ' + result
  );
  this.grunt.log.verbose.writeln(
    'PhotoSessionCallback: Code for ' + picture + ' was ' + code
  );

  ++this.pictureCount;

  this.tookPictureHandler();
};


/**
 * Setter for picture count
 * Mostly for testing purposes
 *
 * @param  {Number} count count
 * @return {Number}       new set count
 */
PhotoBox.prototype.setPictureCount = function( count ) {
  this.pictureCount = count;

  return this.pictureCount;
};


/**
 * Start a session of taking pictures
 */
PhotoBox.prototype.startPhotoSession = function() {
  this.grunt.log.subhead( 'PHOTOBOX STARTED PHOTO SESSION.' );

  this.writeTimestampFile();

  this.pictures.forEach( function( picture ) {
    this.grunt.log.writeln( 'started photo session for ' + picture );

    this.writeOptionsFile( {
      javascriptEnabled             : this.options.javascriptEnabled,
      loadImages                    : this.options.localToRemoteUrlAccessEnabled,
      localToRemoteUrlAccessEnabled : this.options.localToRemoteUrlAccessEnabled,
      password                      : this.options.password,
      userAgent                     : this.options.userAgent,
      userName                      : this.options.userName
    } );

    var args = [
      path.resolve(__dirname, 'photoboxScript.js'),
      picture,
      this.options.indexPath,
      this.options.indexPath + 'options.json'
    ];

    var opts = {};

    if ( this.grunt.option( 'verbose' ) ) {
      opts = {
        stdio: 'inherit'
      };
    }

    this.grunt.log.verbose.writeln( 'Command: phantomjs ' + args.join( ' ' ) + '\n' );

    this.grunt.util.spawn( {
      cmd  : phantomPath,
      args : args,
      opts : opts
    }, function( err, result, code ) {
      this.photoSessionCallback( err, result, code, picture );
    }.bind( this ) )
  }.bind( this ) );
};


/**
 * Handler for emitted 'tookDiff'
 */
PhotoBox.prototype.tookDiffHandler = function() {
  if ( this.diffCount === this.pictures.length ) {
    this.grunt.log.ok( 'PHOTOBOX FINISHED DIFF GENERATION SUCCESSFULLY.' );

    this.createIndexFile( 'default' );
    // call done() to exit grunt task
    this.callback();
  }
};


/**
 * Handler for emitted 'tookPicture'
 *
 * @tested
 */
PhotoBox.prototype.tookPictureHandler = function() {
  if ( this.pictureCount === this.pictures.length ) {
    this.grunt.log.ok( 'PHOTOBOX FINISHED PHOTO SESSION SUCCESSFULLY.' );

    if ( this.options.useImageMagick ) {
      this.grunt.log.writeln(
        '\nNOTE: You defined to use ImageMagick, make sure it is installed.'
      );

      this.createDiffImages();
    } else {
      this.createIndexFile();
      // call done() to exit grunt task
      this.callback();
    }
  }
};


/**
 * Write options file to pass it to
 * phantomjs
 * -> JSON.stringify brings only troubles
 *     as a system argument
 *
 * @param  {Object} options options
 *
 * @tested
 */
PhotoBox.prototype.writeOptionsFile = function( options ) {
  this.grunt.file.write(
    this.options.indexPath + 'options.json',
    JSON.stringify( options )
  );
};


/**
 * Write JSON file to store timestamp
 * of current photosession
 *
 * @tested
 */
PhotoBox.prototype.writeTimestampFile = function() {
  var date       = new Date(),
      dateString = date.toString();

  this.grunt.file.write(
    this.options.indexPath + '/img/current/timestamp.json',
    JSON.stringify( {
      timestamp: dateString
    } )
  );

  this.grunt.log.verbose.writeln(
    'Wrote timestamp file with ' + dateString + '.'
  );
};


module.exports = PhotoBox;
