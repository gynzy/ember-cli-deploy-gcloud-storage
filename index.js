/* jshint node: true */
'use strict';

var minimatch = require('minimatch');
var BasePlugin = require('ember-cli-deploy-plugin');
var Promise = require('ember-cli/lib/ext/promise');
var upload = require('./libs/upload');

module.exports = {
	name: 'ember-cli-deploy-gcloud-storage',

	createDeployPlugin: function (options) {
		var Plugin = BasePlugin.extend({
			name: options.name,

			defaultConfig: {
				bucket: 'ember',
				filePattern: '**/*.{js,css,png,gif,ico,jpg,map,xml,txt,svg,swf,eot,ttf,woff,woff2}',
				distFiles: function (context) {
					return context.distFiles || [];
				},
				gzippedFiles: function (context) {
					return context.gzippedFiles || []; // e.g. from ember-cli-deploy-gzip
				}
			},

			upload: function (context) {
				var self = this;
				var keyFilename = this.readConfig('keyFilename');
				var projectId = this.readConfig('projectId');
				var bucket = this.readConfig('bucket');
				var distFiles = this.readConfig('distFiles');
				var gzippedFiles = this.readConfig('gzippedFiles');
				var filePattern = this.readConfig('filePattern');
				var filesToUpload = distFiles.filter(minimatch.filter(filePattern, {
					matchBase: true
				}));

				this.log('uploading..');

				var config = {
					bucket: bucket,
					fileBase: context.distDir,
					filePaths: filesToUpload,
					gzippedFilePaths: gzippedFiles
				};

				// or use GOOGLE_APPLICATION_CREDENTIALS with path to JSON service account and GCLOUD_PROJECT as projectId
				if (projectId && keyFilename) {
					config['gcloud'] = {
						'keyFilename': keyFilename,
						'projectId': projectId
					};
				}

				return upload(this, config)
					.then(function (filesUploaded) {
						self.log('uploaded ' + filesUploaded.length + ' files ok', {
							verbose: true
						});
						return {
							filesUploaded: filesUploaded
						};
					})
					.catch(this._errorMessage.bind(this));
			},

			_errorMessage: function (error) {
				this.log(error, {
					color: 'red'
				});
				if (error) {
					this.log(error.stack, {
						color: 'red'
					});
				}
				return Promise.reject(error);
			}
		});

		return new Plugin();
	}
};
