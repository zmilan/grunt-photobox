/*
 * grunt-photoBox
 * https://github.com/stefan/grunt-photoBox
 *
 * Copyright (c) 2013 stefan judis
 * Licensed under the MIT license.
 */

var system        = require ( 'system' ),
    webpage       = require( 'webpage' ),
    fs            = require( 'fs' ),
    page          = webpage.create(),
    picture       = system.args[ 1 ],
    split         = picture.split( '|' ),
    url           = split[ 0 ],
    size          = split[ 1 ].split( 'x' ),
    width         = +size[ 0 ],
    height        = +size[ 1 ],
    indexPath     = system.args[ 2 ],
    settings      = fs.read( indexPath + 'options.json' );

if ( settings !== '{}' ) {
  try {
    system.stderr.writeLine( 'Read settings: ' + settings );
    settings = JSON.parse( settings );

    page.settings = settings;
  } catch( e ) {
    console.warn( 'CONSOLE: Error parsing settings | ' + e );

    phantom.exit( 1 );
  }
}

page.onError = function ( msg ) {
    system.stderr.writeLine( 'ERROR:' + msg );
};

page.onConsoleMessage = function( msg, lineNum, sourceId ) {
    system.stderr.writeLine( 'CONSOLE: ' + msg, lineNum, sourceId );
};

page.viewportSize = {
    height : height,
    width  : width
};

page.clipRect = {
  height : height,
  width  : width
};

page.open( url, function( status ) {
  window.setTimeout( function() {
    var imgPath = indexPath +
                    'img/current/' +
                    url.replace( /(http:\/\/|https:\/\/)/, '').replace( /\//g, '-') +
                    '-' + width + 'x' + height +
                    '.png';

    console.log( 'Rendering ' + imgPath );
    page.render( imgPath );

    phantom.exit();
  }, 500 );
} );
