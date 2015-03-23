// used for the Branded v2 Search/Article page

define( [ 'jquery' ], function( $j ) {
'use strict';

var iframe = document.getElementById( 'knowledge_frame' ),
	$iframe = $j( iframe ),
	$kbDoc = $j( iframe.contentDocument ),
	$kbBody,
	iframeHeight,

	resizeIframe = function() {
		iframeHeight = $kbBody.css( 'height' );
		$iframe.css( 'height', iframeHeight );
	},

	checkResize = function() {
		var currentHeight = $kbBody.css( 'height' );

		if ( iframeHeight !== currentHeight ) {
			resizeIframe();
		}
	},

	styleKbIframe = function() {
		// add overriding styles to iframe
		$kbDoc.find( 'head' ).append( '<link rel="stylesheet" type="text/css" href="/d7fafb024da0710062c55dc1f2a64ee3.cssdbx" />' );

		setInterval( checkResize, 500 );
	},

	updateLayout = function() {
		var $kbContainer = $kbDoc.find( '.application' );

		// re-doing the bootstrap rows and columns
		$kbContainer.removeClass( 'container-fluid' ).addClass( 'row' );
		$kbContainer.children( '.ng-scope' ).addClass( 'container-fluid' );
		$kbContainer.find( '.search-bar .col-xs-12.col-md-12.col-lg-12' ).removeClass( 'col-xs-12 col-md-12 col-lg-12' );

		// resize iframe
		resizeIframe();
	};

$kbDoc.ready( function() {
	$kbBody = $kbDoc.find( 'body' );
	iframeHeight = $kbBody.css( 'height' );

	styleKbIframe();

	setTimeout( updateLayout, 800 );
} );

} );
