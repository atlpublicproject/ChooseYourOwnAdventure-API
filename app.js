var koa = require('koa');
var router = require('koa-router')(); //routing lib
var Boom = require('boom');
var fs = require('fs');
var cors = require('koa-cors');

var loader = require('./src/story-loader');

var app = koa();
app.use(cors({
  'Access-Control-Allow-Origin': 'http://localhost:9000/'
}));

const storiesFolder = 'F:\\PublicProjects\\ChooseYourOwnAdventure\\Stories';


//on start, load stories
loader.StoryLoader.LoadStories();
STORY_MAP = loader.StoryLoader.StoryMap;
STORY_HEADERS = loader.StoryLoader.Headers;


router.get('image', '/i/:folder_slug/:image', function*( next ){

    //note, this should be kicked out into an NGNIX file server
    var folder = this.params.folder_slug.replace('-',' ');
    var image = this.params.image;

    var path = storiesFolder + '\\' + folder +  '\\images\\' + image;
    
    //get extension from request
    var li = image.lastIndexOf('.');
    var ext = image.substring(li, li+10);

    this.type = ext;

    console.log ( path );
    this.body = yield readFileThunk( path );
});

router.get('story', '/s/:folder_slug/:action', function*( next ){

  var story = STORY_MAP[ this.params.folder_slug.toLowerCase()];

  if ( story === undefined ){
    return Boom.notFound(this.params.folder_slug);    
  }

  this.body = JSON.stringify( story );
});


router.get('browse', '/b/browse', function*( next ){
  this.body = JSON.stringify( STORY_HEADERS );
});


// x-response-time
app.use(function *(next){
  var start = new Date;
  yield next;
  var ms = new Date - start;
  this.set('X-Response-Time', ms + 'ms');
});

// logger

app.use(function *(next){
  var start = new Date;
  yield next;
  var ms = new Date - start;
  console.log('%s %s - %s', this.method, this.url, ms);
});

// response
app.use(router.routes());
app.use(router.allowedMethods({
  throw: true,
  notImplemented: () => new Boom.notImplemented(),
  methodNotAllowed: () => new Boom.methodNotAllowed()
}));



app.use(function *(){
  this.body = 'Default'; //JSON.stringify( STORY_MAP, 4 );
});

app.listen(3000);

//console.log( STORY_MAP );
console.log("listening on port 3000");


/*** function read file */
var readFileThunk = function(src) {
  return new Promise(function (resolve, reject) {
    fs.readFile(src, function (err, data) {
      if(err) return reject(err);
      resolve(data);
    });
  });
}