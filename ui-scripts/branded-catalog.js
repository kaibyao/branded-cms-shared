define( [ 'jquery', 'underscore', 'backbone' ], function( $j, _, Backbone ) {
'use strict';

var iframe = document.getElementById( 'catalog_frame' ),
	$iframe = $j( iframe ),
	iframeHeight,
	menuIndexMap = {
		'facilities' : 0,
		'finance'    : 1,
		'hr'         : 2,
		'it'         : 3,
		'legal'      : 4,
		'marketing'  : 5
	},

	resizeIframe = function() {
		var $iframeDoc = $j( iframe.contentDocument ),
			$iframeBody = $iframeDoc.find( 'body' );

		iframeHeight = $iframeBody.css( 'height' );
		$iframe.css( 'height', iframeHeight );
	},

	checkResize = function() {
		var $iframeDoc = $j( iframe.contentDocument ),
			$iframeBody = $iframeDoc.find( 'body' ),
			currentHeight = $iframeBody.css( 'height' );

		if ( iframeHeight !== currentHeight ) {
			resizeIframe();
		}
	},

	styleIframe = function() {
		var $iframeDoc = $j( iframe.contentDocument );

		// add overriding styles to iframe
		$iframeDoc.find( 'head' ).append( '<link rel="stylesheet" type="text/css" href="/d7fafb024da0710062c55dc1f2a64ee3.cssdbx" />' );

		setInterval( checkResize, 500 );
	},

	updateLayout = function() {
		var $iframeDoc = $j( iframe.contentDocument ),
			$iframeBody = $iframeDoc.find( 'body' );

		iframeHeight = $iframeBody.css( 'height' );

		// resize iframe
		resizeIframe();
	},

	selectViewCore = {
		el : '.branded-catalog-dropdown',

		events : {
			'click .branded-catalog-dropdown-link' : 'loadCatalog'
		},

		redirectIframe : function( $catalogMenu ) {
			iframe.src = $catalogMenu.find( 'a' ).first().attr( 'href' );
			$j( iframe.contentDocument ).ready( this.setupIframePage );
		},

		setupIframePage : function() {
			setTimeout( function() {
				styleIframe();
				updateLayout();
			}, 800 );

			setInterval( checkResize, 500 );
		},

		firstLoadCatalog : function() {
			// for when the page loads and we load the initial page config

			var $menus = $j( '.page-service_catalog .main-content > .row' ),
				catalog = ( typeof brandedCatalog !== 'undefined' && menuIndexMap[ brandedCatalog ] ) ? brandedCatalog : 'facilities', // determined in the catalog-select dynamic block
				$catalogMenu = $j( $menus[ menuIndexMap[ catalog ] ] );

			$menus.hide();
			$catalogMenu.show();

			if ( !$catalogMenu.find( 'a' ).first().attr( 'href' ) ) {
				console.log( $catalogMenu );
			}

			this.redirectIframe( $catalogMenu );
		},

		loadCatalog : function( ev ) {
			var $menus = $j( '.page-service_catalog .main-content > .row' ),
				$dropdownButton = this.$el.parent().find( '.branded-catalog-dropdown-button' ),
				$dropdownButtonText = this.$el.parent().find( '.branded-catalog-dropdown-button-text' ),
				$target = this.$el.find( ev.currentTarget ),
				catalog = $target.data( 'catalog' ),
				$catalogMenu;

			// Do nothing if the user selects the same catalog as the active catalog
			$dropdownButtonText.empty().append( $target.html() );

			if ( $dropdownButton.data( 'active' ) === $target.data( 'catalog' ) ) {
				return;
			}

			$dropdownButton.data( 'active', $target.data( 'catalog' ) );
			$catalogMenu = $j( $menus[ menuIndexMap[ catalog ] ] );

			$menus.hide();
			$catalogMenu.show();

			this.redirectIframe( $catalogMenu );
		}
	},

	selectView = new ( Backbone.View.extend( selectViewCore ) )();

$j( document ).ready( function() {
	selectView.firstLoadCatalog();

	$j( '.main-content .row .cms_menu_section_blocks .cms_menu_section_blocks_title a' ).on( 'click', selectView.setupIframePage );

	$iframe.on( 'load', selectView.setupIframePage );
} );

} );
