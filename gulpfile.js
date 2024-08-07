const gulp        = require('gulp');
const { src, dest } = require('gulp');
const fileinclude = require('gulp-file-include');
const { series } = require('gulp');

const paths = {
  scripts: {
    src: './source',
    dest: './'
  }
};

async function includeHTML(){
  return src([
    './source/*.html',
    './source/*.md',
    './source/*.js',
    '!header.html', // ignore
    '!footer.html' // ignore
    ])
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(dest(paths.scripts.dest));
}

// async function include_images() {
//   return src('images/*')
//     .pipe(dest('build/images/'));
// }

// async function include_publications() {
//   return src('publications/*')
//     .pipe(dest('build/publications/'));
// }

// exports.default = series(includeHTML, include_images, include_publications);
exports.default = includeHTML;
