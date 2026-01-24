const gulp = require('gulp');
const fileInclude = require('gulp-file-include');

// Task to process HTML files with @@include directives
gulp.task('html', function () {
    return gulp.src('source/*.html')
        .pipe(fileInclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(gulp.dest('./'));
});

// Default task
gulp.task('default', gulp.series('html'));
