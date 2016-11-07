"use strict";
const objects_1 = require('./objects');
const fs = require("fs");
const yaml = require("js-yaml");
const _ = require("underscore");
const path = require('path');
class StoryLoader {
    static LoadStories() {
        let loader = new _StoryLoader();
        StoryLoader.StoryMap = loader.LoadAllStories();
        StoryLoader.AllStories = _.values(StoryLoader.StoryMap);
        StoryLoader.Headers = StoryLoader.AllStories.map((s) => StoryLoader.toHeader(s));
    }
    static Slugify(str) {
        return str.replace(/ /g, '-').toLowerCase();
    }
    static toHeader(story) {
        let c = new objects_1.Cover();
        c.title = story.title;
        c.description = story.description;
        c.slug = story.slug;
        c.tags = story.tags;
        c.pageCount = _.size(story.pages); //slow :(       
        if (story.pages) {
            c.pageStats = StoryLoader.getStoryStats(story.pages);
        }
        return c;
    }
    static getStoryStats(pages) {
        let getPages = (p) => {
            if (p.buttons == null || p.buttons.length == 0)
                return null;
            else
                return p.buttons.filter(b => b.length > 0).map(b => new Number(b[1]));
        };
        let done = {};
        let endings = {};
        let endPathLength = Array();
        let loops = {};
        let merges = {};
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
            let children = getPages(pages[pageNum]);
            if (children == null) {
                endings[pageNum] = 1;
                endPathLength.push(pathLength);
                return;
            }
            //not complete? continue
            children.forEach((c) => {
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
        let completeCount = _.keys(endings).length;
        let loopbackCount = _.values(loops).reduce((sum, val) => sum + val, 0);
        let convergeCount = _.values(merges).reduce((sum, val) => sum + val, 0);
        let avgPath = -1;
        if (endPathLength.length > 0)
            avgPath = endPathLength.reduce((sum, val) => { return sum + val; }, 0) / endPathLength.length;
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
            steps: endPathLength,
        };
    }
}
StoryLoader.AllStories = new Array();
StoryLoader.Headers = new Array();
exports.StoryLoader = StoryLoader;
class _StoryLoader {
    constructor() {
        this.stories = {};
        this.storiesFolder = 'F:\\PublicProjects\\ChooseYourOwnAdventure\\Stories';
        console.log('Created Story Loader');
    }
    LoadAllStories() {
        console.log('Loading Stories...');
        let success = 0;
        let fail = 0;
        /*** class stories loader => method load stories */
        let folders = fs.readdirSync(this.storiesFolder);
        folders.forEach(folder => {
            if (folder != ".git" && folder != ".gitignore" && folder != "README.md") {
                //storyFolderPaths.push(  file );
                let myStory = this.LoadStory(folder);
                let slug = StoryLoader.Slugify(folder);
                myStory.slug = slug;
                if (myStory != null) {
                    this.stories[slug] = myStory;
                    success++;
                }
                else {
                    fail++;
                }
            }
        });
        console.log(`${success} stories loaded. ${fail} stories were unable to load.`);
        return this.stories;
    }
    /*** loads a single story **/
    LoadStory(folder) {
        let s = new objects_1.Story();
        // if error then skip story
        try {
            var dirPath = (file) => { return path.join(this.storiesFolder, folder, file); };
            var metadata = dirPath('metadata.yaml');
            var pages = new Array();
            var i = 1;
            while (fs.existsSync(dirPath(`pages-part-${i}.json`))) {
                pages.push(dirPath(`pages-part-${i}.json`));
                i++;
            }
            this.LoadMetaData(s, metadata);
            this.LoadPages(s, pages);
        }
        catch (e) {
            console.log(`Unable to load story from folder ${folder} : ` + e);
        }
        return s;
    }
    /*** load story metadata */
    LoadMetaData(story, filePath) {
        //read yaml
        // Get document, or throw exception on error
        var doc = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
        story.title = doc['Title'];
        story.description = doc['Description'];
        story.tags = doc['Tags'];
        story.authors = doc['Authors'];
        story.editors = doc['Editors'];
    }
    /*** load story pages and state */
    LoadPages(story, filePaths) {
        if (filePaths.length == 0)
            return;
        var allPages = {};
        for (var filePath of filePaths) {
            var pagesJsonStr = fs.readFileSync(filePath, 'utf8');
            let pagesJson = JSON.parse(pagesJsonStr);
            //map to pages..        
            //: { [pageNumber: number]: Page } = {};
            let pages = _.mapObject(pagesJson, function (val, key) {
                let page = new objects_1.Page();
                page.buttons = val['buttons'];
                page.image = val['image'];
                page.input = val['input'];
                page.text = val['text'];
                return page;
            });
            allPages = Object.assign(allPages, pages);
        }
        story.pages = allPages;
        let inputArrays = _.pluck(_.values(allPages), 'input');
        inputArrays = inputArrays.filter((v) => v !== undefined);
        if (inputArrays.length == 0)
            return;
        let placeholders = {};
        _.each(inputArrays, function (a) {
            var p = new objects_1.Placeholder();
            p.value = '';
            p.description = a[1];
            placeholders[a[0]] = p;
        });
        story.placeholders = placeholders;
    }
}
