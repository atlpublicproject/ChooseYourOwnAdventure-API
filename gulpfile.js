var gulp = require('gulp');
var browserSync = require('browser-sync').create();
var runSequence = require('run-sequence');
var ts = require('gulp-typescript');
var spawn = require('child_process').spawn;
var clean = require('gulp-clean');

var tsProject = ts.createProject('./tsconfig.json',{});
var node;

gulp.task('default', ['build','watch','serve'], function() {
});

gulp.task('serve', function(){
     if (node) node.kill()
     node = spawn('node', ['./dist/app.js'], { stdio: 'inherit' });
     node.on('close', function (code) {
        if (code === 8) {
            gulp.log('Error detected, waiting for changes...');
        }
    });
})

gulp.task('watch', function() {
    gulp.watch(['./src/*.ts'], ['build','serve']);
});
 
gulp.task('build', function () {

      var tsResult = tsProject.src() // instead of gulp.src(...)
        .pipe(tsProject());

    return tsResult.js.pipe(gulp.dest('./dist'));   
});

gulp.task('clean', function() {
    return gulp.src('dist', {read: false})
        .pipe(clean());
})