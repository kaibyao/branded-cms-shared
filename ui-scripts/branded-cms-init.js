// This script loads the layout/bootstrapping for the Branded CMS template as well as any custom functionality using various JS libraries.
var jquery;

( function( $j ) {
	var requireConfig = {
			deps : [ 'jquery', 'brandedlayout' ],

			paths : {
				'jquery' : '/branded-jquery.min.jsdbx?dummy_ext=',
				'bootstrap' : '/bootstrap.min.jsdbx?dummy_ext=',
				'underscore' : '/branded-lodash.jsdbx?dummy_ext=',
				'backbone' : '/branded-backbone.jsdbx?dummy_ext=',
				'infinitescroll' : '/jquery.infinitescroll.min.jsdbx?dummy_ext=',
				'brandedlayout' : '/branded-cms-layout.jsdbx?dummy_ext=',
				'brandedgethelp' : '/branded-get-help.jsdbx?dummy_ext=',
				'brandedtypeaheadbundle' : '/branded-typeahead.bundle.jsdbx?dummy_ext=',
				'brandedtypeaheadsetup' : '/branded-typeahead-setup.jsdbx?dummy_ext=',
				'brandedknowledgebase' : '/branded-knowledgebase.jsdbx?dummy_ext=',
				'brandedcatalog' : '/branded-catalog.jsdbx?dummy_ext='
			},

			shim : {
				'brandedlayout' : { 'deps' : [ 'jquery' ] },
				'bootstrap' : { 'deps' : [ 'jquery' ] }
			},

			callback : function() {
				jquery = jQuery.noConflict();
			}
		};

	$j.getScript( '/require.jsdbx' ).done( function() {
		var pathJsMap = [
				{ path : 'get_help.do', require : 'brandedgethelp' },
				{ path : 'knowledgebase.do', require : 'brandedknowledgebase' },
				{ path : 'service_catalog.do', require : 'brandedcatalog' }
			],
			i;

		requirejs.config( requireConfig );

		for ( i = 0; i < pathJsMap.length; i++ ) {
			if ( window.location.pathname.indexOf( pathJsMap[ i ].path ) !== -1 ) {
				requirejs( [ pathJsMap[ i ].require ], function() {} );
				i = pathJsMap.length;
			}
		}
	} );
} )( jQuery );
