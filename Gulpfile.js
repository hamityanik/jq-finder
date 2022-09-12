const gulp = require('gulp');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const cleanCss = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const rename = require('gulp-rename');

gulp.task('js', function () {
    return gulp.src([
        'src/js/*.js'
    ])
        .pipe(babel({
            presets: ['@babel/preset-env']
        }))
        .pipe(sourcemaps.init({}))
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.write('.', {}))
        .pipe(gulp.dest('dist'))
});

gulp.task('css', function () {
    return gulp.src([
        'src/css/*.css'
    ])
        .pipe(sourcemaps.init({}))
        .pipe(cleanCss())
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.write('.', {}))
        .pipe(gulp.dest('dist'));
});

const series = ['js', 'css'];

gulp.task('default', gulp.series(series));

gulp.task('watch', gulp.series(series, function () {
    gulp.watch('src/css/*.css', gulp.series('css'));
    gulp.watch('src/js/*.js', gulp.series('js'));
}));