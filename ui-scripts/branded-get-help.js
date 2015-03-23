define( [ 'jquery', 'underscore', 'backbone' ], function( $j, _, Backbone ) {
'use strict';

var menuIndexMap = {
		'it'         : 0,
		'facilities' : 1,
		'finance'    : 2,
		'hr'         : 3,
		'legal'      : 4,
		'marketing'  : 5
	};

var selectViewCore = {
		el : '.branded-gethelp-dropdown',

		events : {
			'click .branded-gethelp-dropdown-link' : 'loadDepartment'
		},

		firstLoadDepartment : function() {
			// for when the page loads and we load the initial page config

			var $menus = $j( '.page-get_help .main-content > .row' ),
				$iframe = $j( '#support_frame' ),
				department = ( typeof brandedGethelpDepartment !== 'undefined' ) ? brandedGethelpDepartment : 'it', // determined in the gethelp-select dynamic block
				$departmentMenu = $j( $menus[ menuIndexMap[ department ] ] );

			$menus.hide();
			$departmentMenu.show();

			$iframe[ 0 ].src = $departmentMenu.find( 'a' ).first().attr( 'href' );
		},

		loadDepartment : function( ev ) {
			var $menus = $j( '.page-get_help .main-content > .row' ),
				$dropdownButton = this.$el.parent().find( '.branded-gethelp-dropdown-button' ),
				$dropdownButtonText = this.$el.parent().find( '.branded-gethelp-dropdown-button-text' ),
				$iframe = $j( '#support_frame' ),
				$target = this.$el.find( ev.currentTarget ),
				department = $target.data( 'department' ),
				$departmentMenu;

			// Do nothing if the user selects the same department as the active department
			$dropdownButtonText.empty().append( $target.html() );

			if ( $dropdownButton.data( 'active' ) === $target.data( 'department' ) ) {
				return;
			}

			$dropdownButton.data( 'active', $target.data( 'department' ) );
			$departmentMenu = $j( $menus[ menuIndexMap[ department ] ] );

			$menus.hide();
			$departmentMenu.show();

			$iframe[ 0 ].src = $departmentMenu.find( 'a' ).first().attr( 'href' );
		}
	};

var selectView = new ( Backbone.View.extend( selectViewCore ) )();

$j( document ).ready( function() {
	selectView.firstLoadDepartment();
} );

} );
