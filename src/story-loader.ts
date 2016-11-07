
import { Story, Cover, Page, Placeholder } from './objects';
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as _ from "underscore";
import * as path from 'path';
import * as util from 'util';


export class StoryLoader {

    static AllStories: Array<Story> = new Array<Story>();
    static StoryMap: { [slug: string]: Story };
    static Headers : Array<Cover> = new Array<Cover>();

    public static LoadStories(): void {
        let loader = new _StoryLoader();
        StoryLoader.StoryMap = loader.LoadAllStories();
        StoryLoader.AllStories = _.values(StoryLoader.StoryMap);
        StoryLoader.Headers = StoryLoader.AllStories.map( (s) =>  StoryLoader.toHeader(s) );
    }

    static Slugify(str: string): string {
        return str.replace(/ /g, '-').toLowerCase();
    }

    static toHeader( story : Story ) : Cover {
        let c = new Cover();

        c.title = story.title;
        c.description = story.description;
        c.slug = story.slug;
        c.tags = story.tags;
        
        c.pageCount = _.size(story.pages); //slow :(       
        if ( story.pages ){
            c.pageStats = StoryLoader.getStoryStats( story.pages );
        }

        return c;
    }

    static getStoryStats( pages : { [pageNum : number ] : Page } ){
        let getPages = ( p : Page ) => { if (p.buttons == null || p.buttons.length == 0) return null;
                                         else return p.buttons.filter( b => b.length > 0).map( b => new Number(b[1]) as number ) };

        let done : any = {};

        let endings  : any  = {};
        let endPathLength = Array<number>();
        let loops : any  = {};
        let merges : any = {};
        
        function walk( pageNum : number, prevPageNum: number, pathLength: number, mergeWalk : boolean ){

            //handle merges
            if (!mergeWalk){

                if ( done[ pageNum ] !== undefined && prevPageNum < pageNum){
                    mergeWalk = true;
                    merges[ pageNum ] = ( merges[ pageNum ] + 1 ) || 1 ;
                }

                done[ pageNum ] = 1;                
            }


            pathLength++;

            let children = getPages ( pages[ pageNum] );
            if ( children == null ){
                endings[pageNum] = 1;
                endPathLength.push( pathLength );
                return;
            }

            //not complete? continue
            children.forEach(       
                (c) => {
                    if ( c < pageNum && done[c]){
                 
                        if ( !mergeWalk){
                            console.log( "pageNum => c" + pageNum + '=>' + c );
                            loops[c] = (loops[c] + 1) || 1;
                        }
                    }else{
                        walk( c, pageNum, pathLength, mergeWalk );
                    }   
                }
            );
        }

        walk( 1, 0, 0, false );


        console.log( JSON.stringify(loops, null, 4 ));

        let completeCount : number = _.keys(endings).length;

        let loopbackCount : number = _.values(loops).reduce( (sum:number, val:number) => sum + val , 0 );
        let convergeCount : number = _.values(merges).reduce( (sum:number, val:number) => sum + val , 0 );

        let avgPath  : number = -1;
        if ( endPathLength.length > 0)
            avgPath = endPathLength.reduce( (sum : number, val : number) => { return sum + val; }, 0 ) / endPathLength.length;

        // todo :
        // change to qualitative measures
        //  -> cliffs ahead
        //  -> many endings
        //  ^ based on relative to total length
        // ( systematic categorization of x to length)

        return {
            endings : completeCount,
            loops : loopbackCount,
            merges : convergeCount, 
            steps : endPathLength,
        };
    }

}

class _StoryLoader {

    stories: { [slug: string]: Story } = {};

    storiesFolder: string = 'F:\\PublicProjects\\ChooseYourOwnAdventure\\Stories';

    constructor() {
        console.log('Created Story Loader');
    }


    public LoadAllStories(): { [slug: string]: Story } {

        console.log('Loading Stories...');

        let success = 0;
        let fail = 0;
        /*** class stories loader => method load stories */
        let folders = fs.readdirSync(this.storiesFolder);


        folders.forEach(folder => {            
            if (folder != ".git" && folder !=".gitignore" && folder!="README.md") {

                //storyFolderPaths.push(  file );
                let myStory = this.LoadStory(folder);
                let slug = StoryLoader.Slugify(folder);

                myStory.slug = slug;

                if (myStory != null) {

                    this.stories[slug] = myStory;

                    success++;
                } else {
                    fail++;
                }

            }

        });
        console.log(`${success} stories loaded. ${fail} stories were unable to load.`);

        return this.stories;
    }

    /*** loads a single story **/
    LoadStory(folder : string): Story {

        let s = new Story();

        // if error then skip story
        try {

            var dirPath = (file : string) => { return path.join(this.storiesFolder, folder, file); };

            var metadata = dirPath('metadata.yaml');

            var pages = new Array<string>();
            var i = 1;
            while (fs.existsSync(dirPath(`pages-part-${i}.json`))) {
                pages.push(dirPath(`pages-part-${i}.json`));
                i++;
            }

            this.LoadMetaData(s, metadata);
            this.LoadPages(s, pages);
            //this.AddCover(s);
        } catch (e) {

            console.log(`Unable to load story from folder ${folder} : ` + e);
        }

        return s;
    }


    /*** load story metadata */
    LoadMetaData(story: Story, filePath: string) {

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
    LoadPages(story: Story, filePaths: string[]) {

        if ( filePaths.length == 0)
            return;

        var allPages: { [pageNumber: number]: Page } = {};

        for (var filePath of filePaths) {
            var pagesJsonStr = fs.readFileSync(filePath, 'utf8');

            let pagesJson = JSON.parse(pagesJsonStr);

            //map to pages..        
            //: { [pageNumber: number]: Page } = {};
            let pages =
                _.mapObject(pagesJson, function(val :any, key : any) {
                    let page = new Page();
                    page.buttons = val['buttons'] as string[][];
                    page.image = val['image'] as string;
                    page.input = val['input'] as string[];
                    page.text = val['text'] as string;
                    return  page ;
                });

            allPages = (<any>Object).assign(allPages, pages);
        }
        
        story.pages = allPages;

        let inputArrays = _.pluck(_.values(allPages), 'input') as Array<Array<string>>;
        inputArrays  = inputArrays.filter( (v) => v !== undefined );

        if ( inputArrays.length == 0)
            return;

        let placeholders: { [variable: string]: Placeholder } = {};
        _.each(inputArrays, function ( a : string[] ) {
            var p = new Placeholder();
            p.value = '';
            p.description = a[1];
            placeholders[a[0]] = p;
        });

        story.placeholders = placeholders;
    }

    // AddCover(story : Story){
    //     story.cover = StoryLoader.toHeader(story);
    // }


}
