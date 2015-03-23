// Old, don't use this. This was a failed experiment.

'use strict';
define( [ 'jquery', 'bootstrap', 'brandedtypeaheadbundle', 'brandedtypeaheadsetup', 'underscore', 'backbone' ], function( $j, bootstrap, taBundle, taSetup, _, Backbone ) {
	var searchViewCore = {
			el : '#typeahead-search-text',
			events : {
				'typeahead:selected' : 'showSearchResults'
			},

			initialize : function() {
				var kbBloodhound = new Bloodhound( {
						name : 'knowledge_description',
						remote : {
							url : '/kb_knowledge.do?JSONv2&sysparm_query=GOTOshort_descriptionLIKE%QUERY\%5EORtextLIKE%QUERY',
							filter : function( list ) {
								var i;

								for ( i = 0; i < list.records.length; i++ ) {
									// strip tags from text
									list.records[ i ].text = list.records[ i ].text.replace( /(<([^>]+)>)/g, '' );
									// replace newlines with space
									list.records[ i ].text = list.records[ i ].text.replace( /[\n\r\t]/g, ' ' );
								}
								return list.records;
							},
							replace : function( url, query ) {
								var regex = new RegExp( '%QUERY', 'g' ),
									newUrl = url.replace( regex, query );

								return newUrl;
							}
						},
						datumTokenizer : Bloodhound.tokenizers.obj.whitespace( 'short_description' ),
						queryTokenizer : Bloodhound.tokenizers.whitespace
					} ),
					typeaheadDataset;

				kbBloodhound.initialize();
				typeaheadDataset = taSetup.generateTypeaheadDataset( 'kb-search-description', 'short_description', kbBloodhound.ttAdapter() );
				this.$el.typeahead( { minLength : 3, highlight : true }, typeaheadDataset );
			},

			showSearchResults : function( ev, suggestion, datum ) {
				articleCollection.showArticle( articleCollection.findWhere( { sys_id : suggestion.sys_id } ) );
				return false;
			}
		},

		articleFeedbackCollectionCore = {
			url : '/kb_feedback_list.do?JSONv2',

			parse : function( response ) { return response.records; },

			// calculates the average rating as well as stats + comments for an article
			aggregateArticleStats : function( article ) {
				var totalRating = 0,
					numRatings = 0,
					comments = [],
					feedbacks = this.where( { article : article.get( 'sys_id' ) } );

				_.forEach( feedbacks, function( feedback ) {
					if ( !!feedback.attributes.rating ) {
						totalRating += _.parseInt( feedback.get( 'rating' ) );
						numRatings++;
					}

					if ( !!feedback.attributes.comments ) {
						comments.push( { text : feedback.get( 'comments' ), author : feedback.get( 'sys_created_by' ), date : feedback.get( 'sys_created_on' ) } );
					}
				} );

				if ( comments.length > 1 ) {
					comments = _( _.sortBy( comments, 'date' ) ).reverse().value();
				}

				return {
					comments : comments,
					avgRating : ( numRatings > 0 ) ? totalRating / numRatings : 0
				};
			},

			postHelpful : function( article, helpful ) {
				return this.postFeedback( article, helpful, null, null );
			},

			postRating : function( article, rating ) {
				return this.postFeedback( article, null, rating, null );
			},

			postComment : function( article, comments ) {
				return this.postFeedback( article, null, null, comments );
			},

			postFeedback : function( article, helpful, rating, comments ) {
				var self = this,
					articleSysId = article.get( 'sys_id' ),
					postData = { article : articleSysId };

				if ( !!helpful ) {}

				if ( !!rating ) {}

				if ( !!comments ) {
					postData.comments = comments;
				}

				return $j.ajax( {
					type: "POST",
					url: '/api/now/table/kb_feedback',
					data: JSON.stringify( postData ),
					contentType: 'application/json',
					dataType : 'json'
				} ).done( function( response ) {
					var newRecord = response.result;

					newRecord.article = articleSysId;
					self.add( newRecord );
				} );
			},
		},

		articleCollectionCore = {
			url : '/kb_knowledge_list.do?JSONv2',

			comparator : function( model ) {
				return -_.parseInt( model.get( 'use_count' ) );
			},

			initialize : function( models, options ) {
				this.knowledgebases = options.knowledgebases;
				this.topics = options.topics;
				this.feedback = options.feedback;

				this.knowledgebases.on( 'change', this.toggleKBs, this );
				this.topics.on( 'change', this.toggleTopics, this );
			},

			parse : function( response ) {
				var records = response.records;

				_.forEach( records, function( articleAttributes ) {
					// converting "active" field to boolean (natively is a string).
					articleAttributes.active = !!( articleAttributes.active === 'true' );

					if ( !articleAttributes.kb_knowledge_base ) {
						// defaults the article's KB to the default KnowledgeBase.
						articleAttributes.kb_knowledge_base = 'dfc19531bf2021003f07e2c1ac0739ab';
					}
				} );

				return records;
			},

			getTopics : function() {
				var topics = [];

				// adding + sorting topics
				this.forEach( function( article ) {
					if ( _.findIndex( topics, function( topic ) { return topic === article.attributes.topic; } ) === -1 ) {
						topics.push( article.attributes.topic );
					}
				} );
				topics = _.sortBy( topics );

				return topics;
			},

			toggleKBs : function( kbModel ) {
				var self = this,
					isActive = kbModel.get( 'active' ),
					targetedArticles = this.where( { 'kb_knowledge_base' : kbModel.get( 'sys_id' ), active : !isActive } );

				this.trigger( 'startRefresh' );

				if ( !isActive ) {
					_.forEach( targetedArticles, this.deactivateArticle );
				} else {
					_.forEach( targetedArticles, function( targetedArticle ) {
						var topicIsActive = self.topics.findWhere( { title : targetedArticle.get( 'topic' ) } ).get( 'active' );
						if ( topicIsActive ) {
							self.activateArticle( targetedArticle );
						}
					} );
				}

				this.trigger( 'endRefresh' );
			},

			toggleTopics : function( topicModel ) {
				var self = this,
					isActive = topicModel.get( 'active' ),
					targetedArticles = this.where( { 'topic' : topicModel.get( 'title' ), active : !isActive } );

				this.trigger( 'startRefresh' );

				if ( !isActive ) {
					_.forEach( targetedArticles, this.deactivateArticle );
				} else {
					_.forEach( targetedArticles, function( targetedArticle ) {
						var kbIsActive = self.knowledgebases.findWhere( { sys_id : targetedArticle.get( 'kb_knowledge_base' ) } ).get( 'active' );
						if ( kbIsActive ) {
							self.activateArticle( targetedArticle );
						}
					} );
				}

				this.trigger( 'endRefresh' );
			},

			deactivateArticle : function( article ) {
				article.set( 'active', false );
			},

			activateArticle : function( article ) {
				article.set( 'active', true );
			},

			showArticle : function( article ) {
				this.trigger( 'showArticle', article );
			}
		},

		featuredArticleCollectionCore = {
			url : '/kb_knowledge_keyword_list.do?JSONv2',

			initialize : function( models, options ) {
				this.articles = options.articles;
			},

			parse : function( response ) {
				return response.records;
			}
		},
		featuredArticlesContainerViewCore = {
			el : '.branded-knowledge-featured-list',

			initialize : function() {
				this.collection.articles.on( 'startRefresh', this.detach, this );
				this.collection.articles.on( 'endRefresh', this.attach, this );
			},

			render : function() {
				var self = this;

				self.collection.forEach( function( model ) {
					var itemView = new feedItemView( { model : self.collection.articles.findWhere( { sys_id : model.get( 'knowledge' ) } ) } );
					self.$el.append( itemView.render().el );
				} );

				this.limitArticlesShown();
			},

			detach : function() {
				this.$el.detach();
			},

			attach : function() {
				this.limitArticlesShown();

				this.$el.appendTo( '.branded-knowledge-featured' );
			},

			limitArticlesShown : function() {
				var articleLimit = 5,
					articlesDisplayed = 0;

				this.$el.children().filter( '.active' ).each( function( i, el ) {
					var $el = $j( el );

					if ( $el.hasClass( 'top-result' ) ) {
						$el.removeClass( 'top-result' );
					}

					if ( articlesDisplayed < articleLimit ) {
						$el.addClass( 'top-result' );
						articlesDisplayed++;
					}
				} );
			}
		},
		helpfulArticlesContainerViewCore = {
			el : '.branded-knowledge-helpful-list',

			initialize : function() {
				this.collection.on( 'startRefresh', this.detach, this );
				this.collection.on( 'endRefresh', this.attach, this );
			},

			render : function() {
				var self = this,
					targetedArticles = this.collection.filter( function( article ) { return _.parseInt( article.get( 'use_count' ), 10 ) > 0; } );

				_.forEach( targetedArticles, function( article ) {
					var itemView = new feedItemView( { model : article } );
					self.$el.append( itemView.render().el );
				} );

				this.limitArticlesShown();
			},

			detach : function() {
				this.$el.detach();
			},

			attach : function() {
				this.limitArticlesShown();

				this.$el.appendTo( '.branded-knowledge-helpful' );
			},

			limitArticlesShown : function() {
				var articleLimit = 5,
					articlesDisplayed = 0;

				this.$el.children().filter( '.active' ).each( function( i, el ) {
					var $el = $j( el );

					if ( $el.hasClass( 'top-result' ) ) {
						$el.removeClass( 'top-result' );
					}

					if ( articlesDisplayed < articleLimit ) {
						$el.addClass( 'top-result' );
						articlesDisplayed++;
					}
				} );
			}
		},

		feedItemViewCore = {
			className : 'branded-knowledge-feed-item',
			tagName : 'li',
			events : {
				'click .branded-knowledge-feed-item-link' : 'showArticle'
			},

			initialize : function() {
				this.model.on( 'change:active', this.toggleActive, this );
			},

			render : function() {
				this.$el.append( '<a class="branded-knowledge-feed-item-link" href="javascript:void(0);">'+ this.model.get( 'short_description' ) +'</a>' );
				this.toggleActive();

				return this;
			},

			toggleActive : function() {
				this.$el[ this.model.get( 'active' ) ? 'addClass' : 'removeClass' ]( 'active' );
			},

			showArticle : function() {
				this.model.collection.showArticle( this.model );
			}
		},

		kbModelCore = {
			defaults : {
				active : true
			},

			toggleActive : function() {
				this.set( 'active', !this.get( 'active' ) );
			}
		},
		kbCollectionCore = {
			url : '/kb_knowledge_base_list.do?JSONv2',

			comparator : function( model1, model2 ) {
				var title1 = model1.attributes.title.toLowerCase(),
					title2 = model2.attributes.title.toLowerCase();

				if ( title1 < title2 ) {
					return -1;
				} else if ( title1 > title2 ) {
					return 1;
				}

				return 0;
			},

			parse : function( response ) {
				var records = response.records;

				_.forEach( records, function( record ) {
					// converting "active" field to boolean (natively is a string).
					record.active = !!( record.active === 'true' );
				} );

				return records;
			}
		},
		kbFilterContainerViewCore = {
			el : '.js-branded-knowledge-knowledgebase-filters-list',

			render : function( model ) {
				var self = this;

				self.collection.forEach( function( model ) {
					var itemView = new filterView( { model : model } );
					self.$el.append( itemView.render().el );
				} );
			}
		},

		topicModelCore = {
			defaults : {
				active : true
			},

			toggleActive : function() {
				this.set( 'active', !this.get( 'active' ) );
			}
		},
		topicCollectionCore = {
			populateTopics : function( topicsArr ) {
				var self = this;

				_.forEach( topicsArr, function( topic ) {
					var topicModel = new self.model( { title : topic } );
					self.add( topicModel );
				} );
			}
		},
		topicFilterContainerViewCore = {
			el : '.js-branded-knowledge-topic-filters-list',

			initialize : function() {
				this.collection.on( 'add', this.populateMenu, this );
			},

			populateMenu : function( model ) {
				var itemView = new filterView( { model : model } );

				this.$el.append( itemView.render().el );
			}
		},

		filterViewCore = {
			className : 'branded-knowledge-filter',
			tagName : 'li',
			events : {
				'click .branded-knowledge-filter-toggle' : 'toggleModel'
			},

			initialize : function() {
				this.model.on( 'change:active', this.toggleActive, this );
			},

			render : function() {
				this.$el.append( '<a href="javascript:void(0);" class="branded-knowledge-filter-toggle"><span class="branded-knowledge-filter-check glyphicon glyphicon-check"></span> <span class="branded-knowledge-filter-text">'+ this.model.get( 'title' ) +'</span></a>' );

				this.delegateEvents();

				return this;
			},

			toggleModel : function() {
				this.model.toggleActive();
			},

			toggleActive : function() {
				var isActive = this.model.get( 'active' ),
					$checkboxEl = this.$el.find( '.branded-knowledge-filter-check' );

				if ( isActive ) {
					$checkboxEl.
						removeClass( 'glyphicon-unchecked' ).
						addClass( 'glyphicon-check' );
				} else {
					$checkboxEl.
						removeClass( 'glyphicon-check' ).
						addClass( 'glyphicon-unchecked' );
				}
			}
		},

		articleContainerViewCore = {
			className : 'branded-knowledge-results',

			initialize : function() {
				// we detach the articles container, .branded-knowledge-results, so that we can manipulate the child HTML elements outside of the DOM before re-inserting into the DOM. This makes repaint times super fast in the browser (vs just updating the models and views one by one).
				this.collection.on( 'startRefresh', this.detach, this );
				this.collection.on( 'endRefresh', this.render, this );
			},

			populateArticles : function() {
				var self = this;

				self.collection.forEach( function( model ) {
					var itemView = new articleView( { model : model } );
					self.$el.append(  itemView.render().el );
				} );

				return this;
			},

			render : function() {
				this.$el.appendTo( mainView.el );
			},

			detach : function() {
				this.$el.detach();
			}
		},

		articleViewCore = {
			className : 'branded-knowledge-article',
			events : {
				'click .branded-knowledge-article-title-link' : 'showArticle'
			},

			initialize : function() {
				this.model.on( 'change:active', this.toggleArticle, this );
			},

			render : function() {
				var text = $j( document.createDocumentFragment() ).append( this.model.get( 'text' ) ).text().substr( 0, 100 ),
					kb = this.model.collection.knowledgebases.findWhere( { sys_id : this.model.get( 'kb_knowledge_base' ) } ).get( 'title' ),
					kbText,
					category,
					topic;

				if ( kb.toLowerCase().indexOf( ' knowledge' ) !== -1 ) {
					kbText = kb.substr( 0, kb.toLowerCase().indexOf( ' knowledge' ) );
				} else {
					kbText = kb;
				}

				if ( category = this.model.get( 'kb_category' ) ) {
					kbText += ' > ' + category;
				} else if ( topic = this.model.get( 'topic' ) ) {
					kbText += ' > ' + topic;
				}

				text = $j.trim( text.replace( /\&nbsp;|\n/, ' ' ) );

				this.$el.append( '<h4 class="branded-knowledge-article-title"><a class="branded-knowledge-article-title-link" href="knowledge.do?sysparm_document_key=kb_knowledge,'+ this.model.get( 'sys_id' ) +'">'+ this.model.get( 'short_description' ) +'</a></h4><p class="branded-knowledge-article-summary">'+ text +'</p><div class="branded-knowledge-article-meta"><div class="branded-knowledge-article-meta-info"><span class="branded-knowledge-article-meta-categories">'+ kbText +'</span> | <span class="branded-knowledge-article-meta-published">Published '+ formatDate( this.model.get( 'published' ) ) +'</span> (<span class="branded-knowledge-article-meta-updated">Updated '+ formatDate( this.model.get( 'sys_updated_on' ) ) +'</span>)</div></div>' ); // <div class="branded-knowledge-article-meta-social"><span class="branded-knowledge-article-meta-votes">'+ this.model.get( 'use_count' ) +'<span class="glyphicon glyphicon-thumbs-up"></span></span><span class="branded-knowledge-article-meta-views">Seen '+ this.model.get( 'sys_view_count' ) +' times</span></div>

				this.delegateEvents();

				return this;
			},

			toggleArticle : function() {
				this.$el[ ( this.model.get( 'active' ) ) ? 'show' : 'hide' ]();
			},

			showArticle : function() {
				this.model.collection.showArticle( this.model );
				return false;
			}
		},

		modalViewCore = {
			el : '.branded-knowledge-modal',
			events : {
				'change .branded-knowledge-modal-makecomment-box' : 'togglePostButton',
				'keypress .branded-knowledge-modal-makecomment-box' : 'togglePostButton',
				'paste .branded-knowledge-modal-makecomment-box' : 'togglePostButton',
				'focus .branded-knowledge-modal-makecomment-box' : 'togglePostButton',
				'textInput .branded-knowledge-modal-makecomment-box' : 'togglePostButton',
				'input .branded-knowledge-modal-makecomment-box' : 'togglePostButton',
				'click .branded-knowledge-modal-makecomment-post' : 'postComment'
			},

			initialize : function() {
				this.collection.on( 'showArticle', this.render, this );
			},

			render : function( article ) {
				var self = this,
					articleStats = article.collection.feedback.aggregateArticleStats( article ),
					comments = '';

				this.$el.data( 'article', article.get( 'sys_id' ) );
				this.incrementViewCount( article );

				this.$el.find( '.modal-title-text' ).empty().append( article.get( 'short_description' ) );
				this.$el.find( '.modal-title-rating' ).empty().append( this.generateRatingHtml( articleStats.avgRating ) );
				this.$el.find( '.modal-body' ).empty().append( article.get( 'text' ) );
				this.$el.find( '.branded-knowledge-modal-makecomment-box' ).val( '' ).change();

				if ( articleStats.comments.length ) {
					_.forEach( articleStats.comments, function( comment ) {
						comments += self.generateCommentHtml( comment.author, formatDate( comment.date ), comment.text );
					} );
					this.$el.find( '.branded-knowledge-modal-comments' ).empty().append( comments );
				} else {
					this.$el.find( '.branded-knowledge-modal-comments' ).empty().append( '<p class="branded-knowledge-modal-nocomments">There are no comments for this article yet.</p>' );
				}

				this.$el.modal();
			},

			incrementViewCount : function( article ) {
				$j.get( '/kb_view.do?sys_kb_id=' + article.get( 'sys_id' ) );
			},

			generateRatingHtml : function( rating ) {
				var html = '',
					className = '',
					i = 0;

				rating = Math.round( rating );
				for ( i = 0; i < 5; i++ ) {
					if ( i < rating ) {
						className = 'branded-knowledge-modal-rating-star glyphicon glyphicon-star';
					} else {
						className = 'branded-knowledge-modal-rating-star glyphicon glyphicon-star-empty';
					}

					html += '<span class="'+ className +'"></span>';
				}

				return html;
			},

			generateCommentHtml : function( author, date, text ) {
				return '<div class="branded-knowledge-modal-comment"><div class="branded-knowledge-modal-comment-user"><span class="branded-knowledge-modal-comment-user-name">'+ author +'</span><span class="branded-knowledge-modal-comment-date">'+ date +'</span></div><p class="branded-knowledge-modal-comment-text">'+ text +'</p></div>';
			},

			togglePostButton : function() {
				var $commentBox = this.$el.find( '.branded-knowledge-modal-makecomment-box' );

				this.$el.find( '.branded-knowledge-modal-makecomment-post' ).prop( 'disabled', !$commentBox.val() );
			},

			postComment : function() {
				var self = this,
					comments = this.$el.find( '.branded-knowledge-modal-makecomment-box' ).val();

				this.collection.feedback.postComment( this.collection.findWhere( { sys_id : self.$el.data( 'article' ) } ), comments ).
					done( function( response ) {
						var newRecord = response.result;

						self.$el.find( '.branded-knowledge-modal-makecomment-box' ).val( '' ).change();
						self.$el.find( '.branded-knowledge-modal-comments' ).prepend( self.generateCommentHtml( newRecord.sys_created_by, formatDate( newRecord.sys_created_on ), newRecord.comments ) );
						self.$el.find( '.branded-knowledge-modal-nocomments' ).hide();
					} );
			}
		},

		mainViewCore = {
			el : '.branded-knowledge-main'
		},

		formatDate = function( timestamp ) {
			var date = new Date( timestamp ),
				month = ( date.getMonth() + 1 ).toString(),
				day = ( date.getDate() + 1 ).toString(),
				year = date.getFullYear().toString();

			if ( month.length === 1 ) {
				month = '0' + month;
			}

			if ( day.length === 1 ) {
				day = '0' + day;
			}

			return month +'-'+ day +'-'+ year;
		},

		kbCollection = new ( Backbone.Collection.extend( kbCollectionCore ) )( [], { model : Backbone.Model.extend( kbModelCore ) } ),
		topicCollection = new ( Backbone.Collection.extend( topicCollectionCore ) )( [], { model : Backbone.Model.extend( topicModelCore ) } ),
		articleFeedbackCollection = new ( Backbone.Collection.extend( articleFeedbackCollectionCore ) )(),
		articleCollection = new ( Backbone.Collection.extend( articleCollectionCore ) )( [], { knowledgebases : kbCollection, topics : topicCollection, feedback : articleFeedbackCollection } ),
		featuredArticleCollection = new ( Backbone.Collection.extend( featuredArticleCollectionCore ) )( [], { articles : articleCollection } ),

		filterView = Backbone.View.extend( filterViewCore ),
		articleView = Backbone.View.extend( articleViewCore ),
		feedItemView = Backbone.View.extend( feedItemViewCore ),

		searchView = new ( Backbone.View.extend( searchViewCore ) )( { collection : articleCollection } ),
		mainView = new ( Backbone.View.extend( mainViewCore ) )(),
		modalView = new ( Backbone.View.extend( modalViewCore ) )( { collection : articleCollection } ),
		kbFilterContainerView = new ( Backbone.View.extend( kbFilterContainerViewCore ) )( { collection : kbCollection } ),
		topicFilterContainerView = new ( Backbone.View.extend( topicFilterContainerViewCore ) )( { collection : topicCollection } ),
		articleContainerView = new ( Backbone.View.extend( articleContainerViewCore ) )( { collection : articleCollection } ),
		featuredArticlesContainerView = new ( Backbone.View.extend( featuredArticlesContainerViewCore ) )( { collection : featuredArticleCollection } ),
		helpfulArticlesContainerView = new ( Backbone.View.extend( helpfulArticlesContainerViewCore ) )( { collection : articleCollection } );

	$j.when( kbCollection.fetch(), articleCollection.fetch(), featuredArticleCollection.fetch() ).done( function() {
		kbFilterContainerView.render();
		topicCollection.populateTopics( articleCollection.getTopics() );
		articleContainerView.populateArticles().render();
		featuredArticlesContainerView.render();
		helpfulArticlesContainerView.render();
	} );

	articleFeedbackCollection.fetch();
} );
