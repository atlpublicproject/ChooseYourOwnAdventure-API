"use strict";
var story_loader_1 = require('./story-loader');
var http = require('http');
var port = 3000;
//start up server
//Load Stories
story_loader_1.StoryLoader.LoadStories();
//api here!
//Browse 
// /b/stories
// /b/stories?q=text  
// ( list of stories with search by title, description, tags )
// ( filtered by goodnes of fit )
// Story Queries
// /s/title-slug/header
// /s/title-slug/metadata
// /s/title-slug/credits
// /s/title-slug/state
// /s/title-slug/# ( page number )
// /s/title-slug/all ( all story (pages?) data ) 
// /s/story-directory into => Stories/Story Directory
// /i/story-directory/image.jpg into => Stories/Story Directory/images/image.jpg
