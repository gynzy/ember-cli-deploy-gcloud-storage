/* jshint node: true */
var path = require('path');
var gcloud = require('gcloud');
var Promise = require('ember-cli/lib/ext/promise');


module.exports = function uploadToGCS(plugin, config) {
	var cloud = gcloud(config.gcloud);
	var gcs = cloud.storage();
	var bucket = gcs.bucket(config.bucket);
	var promises = [];
	var total = config.filePaths.length;

	var upload = function (basePath, filePath, isGzipped, resolve, reject) {
		bucket.upload(basePath, {
			destination: filePath,
			gzip: !isGzipped,
			validation: 'crc32c'
		}, function (err, file /*, apiResponse */ ) {
			if (err) {
				reject(err);
			} else {
				file.makePublic(function (err /*, res */ ) {
					if (err) {
						reject(err);
					} else {
						file.download({
							validation: false
						}, function (err, contents) {
							if (err) {
								reject(err);
							} else {
								plugin.log('✔  ' + filePath, {
									verbose: true
								});
								resolve(contents.toString('utf8'));
							}
						});
					}
				});
			}
		});
	};

	for (var i = 0; i < total; i++) {
		var filePath = config.filePaths[i];
		var basePath = path.join(config.fileBase, filePath);
		var isGzipped = config.gzippedFilePaths.indexOf(filePath) !== -1;
		promises.push(new Promise(function (resolve, reject) {
			// throttling to 20 reqeusts per second
			setTimeout(upload.bind(null, basePath, filePath, isGzipped, resolve, reject), i * 50);
		}));
	}
	return Promise.all(promises);
};
