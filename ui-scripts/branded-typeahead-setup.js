'use strict';
define( [ 'brandedtypeaheadbundle' ], function() {
	return {
		generateTypeaheadDataset : function( name, displayKey, source, textField ) {
			textField = textField || 'text';

			return {
				name: name,
				displayKey: displayKey,
				source: source,
				templates : {
					empty : '<div class="typeahead-search-noresults">No search results.</div>',
					suggestion : function( obj ) {
						return '<div class="typeahead-search-suggestion"><h4 class="typeahead-search-suggestion-title">'+ obj.short_description +'</h4><p class="typeahead-search-suggestion-text">'+ obj[ textField ] +'</p></div>';
					}
				}
			};
		},

		submitTypeahead : function( submitUrl ) {
			var typeaheadSearchInputEl = document.querySelector( '#typeahead-search-text' );

			window.location.href = submitUrl;
			return false;
		}
	};
} );
