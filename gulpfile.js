var gulp = require('gulp');
var browserSync = require('browser-sync').create();
var runSequence = require('run-sequence');
var ts = require('gulp-typescript');
var spawn = require('child_process').spawn;


gulp.task('default', ['build','watch'], function() {
  //spawn('node', ['dist/app.js'], { stdio: 'inherit' });
  console.log("command 'run' executed");
});

gulp.task('watch', function() {
    gulp.watch(['./src/*.ts','!./src/typings/**'], ['build']);
});
 
gulp.task('build', function () {
    return gulp.src('src/story-loader.ts')
        .pipe(ts({
            noImplicitAny: true
            //,out: 'app.js'
        }))
        .pipe(gulp.dest('dist'));
});

// gulp.task('clean', function() {
//   return del.sync('built');
// })


// gulp.task('browserSync', function() {
//   browserSync.init({
//     server: {
//       baseDir: 'dist'
//     },
//   })
// })
