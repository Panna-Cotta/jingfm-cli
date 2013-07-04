/**
 * Module dependencies.
 */
var program = require('commander');
var request = require('request');
var api_url = 'http://jing.fm/api/v1';
var Q = require('q');
var exec = require('child_process').exec;
var child;

// Get options from node process
var options = process.argv;
// Note: http://nodejs.org/api/process.html#process_process_argv
console.log('尝试登录到 Jing.fm ...');
login(options[2], options[3], options[4])
        .then(getList).then(getUrl).then(function(url) {
            console.log('尝试打开浏览器...');
            play(url);
        }, function(err) {
            console.log(err);
        });

/**
 * Open the song in the browser
 *
 * @param  {[string]} url
 */
function play(url) {
    var child = exec('open ' + url + '?start=0', function(error, stdout, stderr) {
        console.log('享受音乐吧!');
    });
}

/**
 * Login to get the session
 *
 * @param email
 * @param password
 * @param keywords
 * @return response object
 */
function login(email, pwd, keywords) {
    var def = Q.defer();

    var u = api_url + '/sessions/create';
    request.post({
        url: u,
        form: {
            email: email,
            pwd: pwd
        },
        json: true
    }, function(err, response, body) {
        if (err) def.reject(err);
        console.log('成功登录到 Jing.fm ...');
        def.resolve({
            headers: response.headers,
            body: body,
            keywords: keywords
        });
    })

    return def.promise;
}

/**
 * Get the play list
 *
 * @param options
 * @return song list object
 */
function getList(options) {
    var def = Q.defer();

    var headers = options.headers;
    var body = options.body;
    var keywords = options.keywords;

    var u = api_url + '/search/jing/fetch_pls';
    request.post({
        url: u,
        headers: {
            'Jing-A-Token-Header': headers['jing-a-token-header'],
            'Jing-R-Token-Header': headers['jing-r-token-header']
        },
        form: {
            q: keywords,
            u: body.result.usr.id
        },
        json: true
    }, function(err, response, body) {
        if (err) def.reject(err);
        console.log('获取歌曲列表中 ...');
        if (body.result.total === 0) {
            def.reject(new Error('Jing.fm 好像没找到你要的歌，换个关键词吧亲！'));
        } else {
            console.log('即将播放 %s 的 %s', body.result.items[0].atn, body.result.items[0].n);
            def.resolve({
                headers: headers,
                mid: body.result.items[0].mid
            });
        }
    });

    return def.promise;
}

/**
 * Get song url
 *
 * @param options
 * @return song url
 */
function getUrl(options) {
    var def = Q.defer();

    var u = api_url + '/media/song/surl';
    var headers = options.headers;

    request.post({
        url: u,
        headers: {
            'Jing-A-Token-Header': headers['jing-a-token-header'],
            'Jing-R-Token-Header': headers['jing-r-token-header']
        },
        form: { mid: options.mid },
        json: true
    }, function(err, response, body) {
        if (err) def.reject(err);
        console.log('尝试获取歌曲播放地址 ...');
        def.resolve(body.result);
    });

    return def.promise;
}
