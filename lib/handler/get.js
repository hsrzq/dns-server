"use strict";
/*!
 * dns-server - handler/get.js
 * Copyright(c) 2016 LnsooXD <LnsooXD@gmail.com>
 * MIT Licensed
 */
const co = require('co');
const compose = require('koa-compose');
const debug = require('debug')('dns-server:handler:get');

module.exports = function createGetHandler(self) {
  return function handler(req, res) {
    let body = {
      error: 1,
      msg: 'unknown error',
      result: {
        data: [],
        time: -1,
        len: 0
      },
      request: 'unknown'
    };
    if (!self.checkMethod(req)) {
      body.error = 100;
      body.msg = 'Unsupported Method: ' + self.method;
      send(self, body, res);
    } else {
      let reqData = parseDomainAndType(req, self.config.requestEncode);
      if (!reqData) {
        body.error = 101;
        body.msg = 'Domain Parse Error';
        send(self, body, res);
      } else {
        body.request = reqData;
        self.runWares(body, 'middlewares', function (e) {
          if (e === false) {
            send(self, body, res);
          } else {
            body.error = 102;
            body.msg = 'Server Internal Error: ' + e;
            send(self, body, res);
            self.emit('error', e);
          }
        });
      }
    }
  };
};

function parseDomainAndType(req, encode) {
  let uri = decodeURIComponent(req.url);
  uri = uri.substr(1);
  if (encode) {
    uri = new Buffer(uri, encode).toString();
  }
  uri = '/' + uri;
  debug(uri);
  if (/^\/@(\w+)\:([0-9a-zA-Z\.\-\u4E00-\u9FA5\uF900-\uFA2D]+)/i.test(uri)) {
    return {
      type: RegExp.$1.toUpperCase(),
      domain: RegExp.$2
    }
  } else {
    return false;
  }
}


function send(self, body, res) {
  let ctx = {
    body: body,
    headers: {}
  };

  self.runWares(ctx, 'postwares', function (e) {
    if (e === false) {
      res.writeHead(200, ctx.headers);
      res.end(ctx.body);
    } else {
      body = 'Service Internal Error: ' + e;
      res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
      });
      res.end(body);
    }
  });
}
