"use strict";
var objects_1 = require('./objects');
var fs = require("fs");
var yaml = require("js-yaml");
var _ = require("underscore");
var path = require('path');
var StoryLoader = (function () {
    function StoryLoader() {
    }
    StoryLoader.LoadStories = function () {
        var loader = new _StoryLoader();
        StoryLoader.StoryMap = loader.LoadAllStories();
        StoryLoader.AllStories = _.values(StoryLoader.StoryMap);
        StoryLoader.Headers = StoryLoader.AllStories.map(function (s) { return s.cover; });
    };
    StoryLoader.Slugify = function (str) {
        return str.replace(/ /g, '-').toLowerCase();
    };
    StoryLoader.toHeader = function (story) {
        var c = new objects_1.Cover();
        c.title = story.title;
        c.description = story.description;
        c.slug = story.slug;
        c.tags = story.tags;
        c.pageCount = _.size(story.pages); //slow :(       
        if (story.pages) {
            c.pageStats = StoryLoader.getStoryStats(story.pages);
        }
        return c;
    };
    StoryLoader.getStoryStats = function (pages) {
        var getPages = function (p) {
            if (p.buttons == null || p.buttons.length == 0)
                return null;
            else
                return p.buttons.filter(function (b) { return b.length > 0; }).map(function (b) { return new Number(b[1]); });
        };
        var done = {};
        var endings = {};
        var endPathLength = [];
        var loops = {};
        var merges = {};
        function walk(pageNum, prevPageNum, pathLength, mergeWalk) {
            //handle merges
            if (!mergeWalk) {
                if (done[pageNum] !== undefined && prevPageNum < pageNum) {
                    mergeWalk = true;
                    merges[pageNum] = (merges[pageNum] + 1) || 1;
                }
                done[pageNum] = 1;
            }
            pathLength++;
            var children = getPages(pages[pageNum]);
            if (children == null) {
                endings[pageNum] = 1;
                endPathLength.push(pathLength);
                return;
            }
            //not complete? continue
            children.forEach(function (c) {
                if (c < pageNum && done[c]) {
                    if (!mergeWalk) {
                        console.log("pageNum => c" + pageNum + '=>' + c);
                        loops[c] = (loops[c] + 1) || 1;
                    }
                }
                else {
                    walk(c, pageNum, pathLength, mergeWalk);
                }
            });
        }
        walk(1, 0, 0, false);
        console.log(JSON.stringify(loops, null, 4));
        var completeCount = _.keys(endings).length;
        var loopbackCount = _.values(loops).reduce(function (sum, val) { return sum + val; }, 0);
        var convergeCount = _.values(merges).reduce(function (sum, val) { return sum + val; }, 0);
        var avgPath = -1;
        if (endPathLength.length > 0)
            avgPath = endPathLength.reduce(function (sum, val) { return sum + val; }, 0) / endPathLength.length;
        // todo :
        // change to qualitative measures
        //  -> cliffs ahead
        //  -> many endings
        //  ^ based on relative to total length
        // ( systematic categorization of x to length)
        return {
            endings: completeCount,
            loops: loopbackCount,
            merges: convergeCount,
            steps: endPathLength
        };
    };
    StoryLoader.AllStories = new Array();
    StoryLoader.Headers = new Array();
    return StoryLoader;
}());
exports.StoryLoader = StoryLoader;
var _StoryLoader = (function () {
    function _StoryLoader() {
        this.stories = {};
        this.storiesFolder = 'F:\\PublicProjects\\ChooseYourOwnAdventure\\Stories';
        console.log('Created Story Loader');
    }
    _StoryLoader.prototype.LoadAllStories = function () {
        var _this = this;
        console.log('Loading Stories...');
        var success = 0;
        var fail = 0;
        /*** class stories loader => method load stories */
        var folders = fs.readdirSync(this.storiesFolder);
        folders.forEach(function (folder) {
            if (folder != "__Server") {
                //storyFolderPaths.push(  file );
                var myStory = _this.LoadStory(folder);
                var slug = StoryLoader.Slugify(folder);
                myStory.slug = slug;
                if (myStory != null) {
                    _this.stories[slug] = myStory;
                    success++;
                }
                else {
                    fail++;
                }
            }
        });
        console.log(success + " stories loaded. " + fail + " stories were unable to load.");
        return this.stories;
    };
    /*** loads a single story **/
    _StoryLoader.prototype.LoadStory = function (folder) {
        var _this = this;
        var s = new objects_1.Story();
        // if error then skip story
        try {
            var dirPath = function (file) { return path.join(_this.storiesFolder, folder, file); };
            var metadata = dirPath('metadata.yaml');
            var pages = [];
            var i = 1;
            while (fs.existsSync(dirPath("pages-part-" + i + ".json"))) {
                pages.push(dirPath("pages-part-" + i + ".json"));
                i++;
            }
            this.LoadMetaData(s, metadata);
            this.LoadPages(s, pages);
            this.AddCover(s);
        }
        catch (e) {
            console.log(("Unable to load story from folder " + folder + " : ") + e);
        }
        return s;
    };
    /*** load story metadata */
    _StoryLoader.prototype.LoadMetaData = function (story, filePath) {
        //read yaml
        // Get document, or throw exception on error
        var doc = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
        story.title = doc['Title'];
        story.description = doc['Description'];
        story.tags = doc['Tags'];
        story.authors = doc['Authors'];
        story.editors = doc['Editors'];
    };
    /*** load story pages and state */
    _StoryLoader.prototype.LoadPages = function (story, filePaths) {
        if (filePaths.length == 0)
            return;
        var allPages = {};
        for (var _i = 0, filePaths_1 = filePaths; _i < filePaths_1.length; _i++) {
            var filePath = filePaths_1[_i];
            var pagesJsonStr = fs.readFileSync(filePath, 'utf8');
            var pagesJson = JSON.parse(pagesJsonStr);
            //map to pages..        
            //: { [pageNumber: number]: Page } = {};
            var pages = _.mapObject(pagesJson, function (val, key) {
                var page = new objects_1.Page();
                page.buttons = val['buttons'];
                page.image = val['image'];
                page.input = val['input'];
                page.text = val['text'];
                return page;
            });
            allPages = Object.assign(allPages, pages);
        }
        story.pages = allPages;
        var inputArrays = _.pluck(_.values(allPages), 'input');
        inputArrays = inputArrays.filter(function (v) { return v !== undefined; });
        if (inputArrays.length == 0)
            return;
        var placeholders = {};
        _.each(inputArrays, function (a) {
            var p = new objects_1.Placeholder();
            p.value = '';
            p.description = a[1];
            placeholders[a[0]] = p;
        });
        story.placeholders = placeholders;
    };
    _StoryLoader.prototype.AddCover = function (story) {
        story.cover = StoryLoader.toHeader(story);
    };
    return _StoryLoader;
}());
