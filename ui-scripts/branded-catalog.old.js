define( [ 'jquery', 'brandedtypeaheadbundle', 'brandedtypeaheadsetup', 'underscore', 'backbone' ], function( $j, taBundle, taSetup, _, Backbone ) {
	'use strict';

	// failed experiment. Don't use. Please salvage if possible.

	var searchViewCore = {
			el : '.typeahead-search',
			events : {
				'typeahead:selected #typeahead-search-text' : 'showSearchResults',
				'submit' : 'doNothing'
			},

			initTypeahead : function() {
				var searchItems = _.cloneDeep( _.pluck( this.collection.models, 'attributes' ) ),
					catalogItems,
					typeaheadDataset;

				_.forEach( searchItems, function( item ) {
					var $temp = $j( document.createDocumentFragment() );

					$temp.append( item.description );
					item.description = $temp.text();
				} );

				catalogItems = new Bloodhound( {
					local : searchItems,
					datumTokenizer : Bloodhound.tokenizers.obj.whitespace( 'short_description' ),
					queryTokenizer : Bloodhound.tokenizers.whitespace
				} );
				catalogItems.initialize();
				typeaheadDataset = taSetup.generateTypeaheadDataset( 'catalog-search-short_description', 'short_description', catalogItems.ttAdapter(), 'description' );

				this.$el.find( '#typeahead-search-text' ).typeahead( { minLength : 3, highlight : true }, typeaheadDataset );
			},

			showSearchResults : function( ev, suggestion, datum ) {
				this.collection.trigger( 'openCatalogItem', this.collection.findWhere( { sys_id : suggestion.sys_id } ) );
			},

			doNothing : function() {
				return false;
			}
		},

		catalogCollectionCore = {
			url : '/sc_catalog_list.do?JSONv2',

			parse : function( response ) { return response.records; }
		},

		categoryModelCore = {
			children : [],
			parent : null
		},
		categoryCollectionCore = {
			url : '/sc_category_list.do?JSONv2',

			initialize : function( models, options ) {
				this.catalogs = options.catalogs;
			},

			parse : function( response ) { return response.records; },

			establishRelations : function() {
				var self = this;

				self.forEach( function( model ) {
					var parentId = model.get( 'parent' ),
						parentModel;

					model.catalog = self.catalogs.findWhere( { sys_id : model.get( 'sc_catalog' ) } );

					if ( !!parentId ) {
						parentModel = self.findWhere( { sys_id : parentId } );
						parentModel.children.push( model );
						model.parent = parentModel;
					}
				} );
			}
		},

		itemModelCore = {
			category : null,
			catalogs : [],
		},
		itemCollectionCore = {
			url : '/sc_cat_item_list.do?JSONv2&sysparm_query=active%3Dtrue%5Ecategory!%3D10d826eac6112276009d4a908fe35398%5EORcategory%3DNULL%5Esc_catalogs!%3DNULL%5Eshort_descriptionISNOTEMPTY&sysparm_first_row=1&sysparm_view=',

			initialize : function( models, options ) {
				this.categories = options.categories;
			},

			parse : function( response ) {
				var records = response.records;

				_.forEach( records, function( record ) {
					if ( !!catalogItemImages[ record.sys_id ].image ) {
						record.image = catalogItemImages[ record.sys_id ].image;
					}

					if ( !!catalogItemImages[ record.sys_id ].icon ) {
						record.icon = catalogItemImages[ record.sys_id ].icon;
					}
				} );

				return records;
			},

			establishRelations : function() {
				var self = this;

				self.forEach( function( model ) {
					var catalogs = model.get( 'sc_catalogs' );

					model.catalogs = catalogs.split( ',' );

					model.category = self.categories.findWhere( { sys_id : model.get( 'category' ) } );
				} );
			},

			getItemsGroupedByCatalogs : function() {
				return this.groupBy( 'sc_catalogs' );
			}
		},

		myRequestedItemsCollectionCore = {
			url : '/sc_req_item_list.do?JSONv2&sysparm_query=opened_by%3Djavascript%3Ags.getUserID()%5EORrequest.requested_for%3Djavascript%3Ags.getUserID()',

			comparator : 'sys_created_on',

			initialize : function( models, options ) {
				this.items = options.items;
			},

			parse : function( response ) { return response.records; },

			getPastItems : function() {
				var self = this,
					pastItems = [],
					itemsSoFar = [];

				if ( !self.length ) {
					return pastItems;
				}

				self.forEach( function( pastRequest ) {
					var sysId = pastRequest.get( 'cat_item' ),
						catalogItem = self.items.findWhere( { sys_id : sysId } );

					if ( !_.findWhere( itemsSoFar, sysId ) ) {
						itemsSoFar.push( sysId );
						pastItems.push( catalogItem );
					}
				} );

				return pastItems;
			},

			getRelatedItems : function() {
				// gets other items from the same category as previously requested items and returns a random set
				var relatedCatalogs = [],
					relatedCatalogItems = [],
					pastItems = this.getPastItems(),
					pastItemIds = _.pluck( _.pluck( pastItems, 'attributes' ), 'sys_id' ),
					itemsGroupedByCatalogs = this.items.getItemsGroupedByCatalogs();

				if ( !this.length ) {
					return relatedCatalogItems;
				}

				_.forEach( pastItems, function( pastRequestedItem ) {
					relatedCatalogs.push( pastRequestedItem.get( 'sc_catalogs' ) );
				} );

				relatedCatalogs = _.intersection( relatedCatalogs );

				_.forEach( relatedCatalogs, function( catalogs ) {
					_.forEach( itemsGroupedByCatalogs[ catalogs ], function( catalogItem ) {
						if ( !_.findWhere( pastItemIds, catalogItem.get( 'sys_id' ) ) && ( !!catalogItem.get( 'image' ) || !!catalogItem.get( 'icon' ) ) ) {
							relatedCatalogItems.push( catalogItem );
						}
					} );
				} );

				return relatedCatalogItems;
			}
		},

		mainViewCore = {
			el : '.branded-catalog-container'
		},

		relatedItemsContainerViewCore = {
			el : '.branded-related-items',

			render : function() {
				var maxItems = 8,
					randomRelatedItems = _.sample( this.collection.getRelatedItems(), maxItems ),
					$tempContainer = $j( document.createDocumentFragment() );

				_.forEach( randomRelatedItems, function( item ) {
					var view = new itemView( { model : item } );

					$tempContainer.append( view.render().el );
				} );

				this.$el.find( '.branded-related-items-list' ).append( $tempContainer );
			}
		},
		myRequestedItemsContainerViewCore = {
			el : '.branded-requested-items',

			render : function() {
				var maxItems = 8,
					randomPastItems = _.sample( this.collection.getPastItems(), maxItems ),
					$tempContainer = $j( document.createDocumentFragment() );

				_.forEach( randomPastItems, function( item ) {
					var view = new itemView( { model : item } );

					$tempContainer.append( view.render().el );
				} );

				this.$el.find( '.branded-requested-items-list' ).append( $tempContainer );
			}
		},
		itemViewCore = {
			tagName : 'li',
			className : 'branded-main-item col-sm-3',
			events : {
				'click .branded-main-item-link' : 'showModal'
			},

			render : function() {
				var imageSrc = this.model.get( 'image' ) || this.model.get( 'icon' );

				this.$el.append( '<a class="branded-main-item-link" href="javascript:void(0);"><img class="branded-main-item-image" src="'+ imageSrc +'" /><div class="branded-main-item-title">'+ this.model.get( 'short_description' ) +'</div></a>' );

				return this;
			},

			showModal : function() {
				this.model.collection.trigger( 'openCatalogItem', this.model );
			}
		},

		// secondaryContainerViewCore = {
		// 	el : '.branded-catalog-secondary'
		// },
		// secondaryItemViewCore = {
		// 	tagName : 'li',
		// 	className : 'branded-secondary-item'
		// },

		modalViewCore = {
			el : '.branded-catalog-modal',
			events : {},

			initialize : function() {
				this.collection.on( 'openCatalogItem', this.render, this );
			},

			render : function( item ) {
				var self = this,
					$iframe;

				this.$el.data( 'item', item.get( 'sys_id' ) );

				this.$el.find( '.modal-title' ).empty().append( item.get( 'short_description' ) );
				this.$el.find( '.modal-body' ).empty().append( this.generateCatalogItemIframe( item ) );

				this.$el.modal();
			},

			generateCatalogItemIframe : function( catalogItem ) {
				var frameText = '<iframe class="branded-catalog-modal-iframe" width="100%" height="100%" frameborder="0" allowfullscreen="true" src="/'+ this.generateCatalogItemUrl( catalogItem ) +'"></iframe>',
					$frame = $j( frameText );

				return $frame;
			},

			generateCatalogItemUrl : function( catalogItem ) {
				var urlPath = ( catalogItem.get( 'sys_class_name' ) === 'sc_cat_item_guide' ) ? 'com.glideapp.servicecatalog_cat_item_guide_view.do?sysparm_initial=true&sysparm_guide=' : 'com.glideapp.servicecatalog_cat_item_view.do?sysparm_id=';

				urlPath += catalogItem.get( 'sys_id' );
				return urlPath;
			}
		},

		catalogCollection,
		categoryCollection,
		itemCollection,
		myRequestedItemsCollection,

		searchView,
		mainView,
		relatedItemsContainerView,
		myRequestedItemsContainerView,
		secondaryContainerView,
		secondaryItemView,
		itemView,
		modalView;

	catalogCollection = new ( Backbone.Collection.extend( catalogCollectionCore ) )();
	categoryCollection = new ( Backbone.Collection.extend( categoryCollectionCore ) )( [], { model : Backbone.Model.extend( categoryModelCore ), catalogs : catalogCollection } );
	itemCollection = new ( Backbone.Collection.extend( itemCollectionCore ) )( [], { model : Backbone.Model.extend( itemModelCore ), categories : categoryCollection } );
	myRequestedItemsCollection = new ( Backbone.Collection.extend( myRequestedItemsCollectionCore ) )( [], { items : itemCollection } );

	searchView = new ( Backbone.View.extend( searchViewCore ) )( { collection : itemCollection } );
	mainView = new ( Backbone.View.extend( mainViewCore ) )();
	relatedItemsContainerView = new ( Backbone.View.extend( relatedItemsContainerViewCore ) )( { collection : myRequestedItemsCollection } );
	myRequestedItemsContainerView = new ( Backbone.View.extend( myRequestedItemsContainerViewCore ) )( { collection : myRequestedItemsCollection } );
	modalView = new ( Backbone.View.extend( modalViewCore ) )( { collection : itemCollection } );

	itemView = Backbone.View.extend( itemViewCore );
	// secondaryItemView = Backbone.View.extend( secondaryItemViewCore );

	$j.when( catalogCollection.fetch(), categoryCollection.fetch(), itemCollection.fetch(), myRequestedItemsCollection.fetch() ).done( function() {
		searchView.initTypeahead();
		myRequestedItemsContainerView.render();
		relatedItemsContainerView.render();
	} );
} );
