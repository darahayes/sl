#!/usr/bin/env node
'use strict';

const program = require('commander')
const fs = require('fs-extra')
const path = require('path')
const http = require('http')
const url = require('url')

const cwd = process.cwd()

program
  .version('0.0.1')
  .command('create [script]')
  .alias('c')
  .description('Create a serveless function in AWS Lambda')
  .action(create)

program
  .command('run [script]')
  .alias('r')
  .description('Create a server to run your lambda function locally')
  .option('-p, --port [port]', 'set the server port')
  .action(run)

program.parse(process.argv);

function create(target) {
  if (target) {
    copyTarget(target)
  }
  else {
    console.log('target script not supplied. Assuming current directory')
    copyCwd()
  }
}

function copyTarget(target) {
  let tmp = fs.mkdtempSync('/tmp' + path.sep)
  let targetFile = path.resolve(cwd, target)
  let targetDir = path.dirname(targetFile)
  let packageFile = path.resolve(path.join(targetDir, 'package.json'))

  fs.copySync(targetFile, path.join(tmp, path.basename(targetFile)))

  if (fs.existsSync(packageFile)) {
    fs.copySync(packageFile, path.join(tmp, path.basename(packageFile)))
  }
  console.log(fs.readdirSync(tmp))
}

function copyCwd() {
  let tmp = fs.mkdtempSync('/tmp' + path.sep)
  let packageFile = path.resolve(path.join(cwd, 'package.json'))
  if (fs.existsSync(packageFile)) {
    fs.copySync(cwd, tmp, { filter: node_modules_filter})
    console.log(fs.readdirSync(tmp))
  }
  else {
    console.log('No package file found.')
  }
}

function node_modules_filter(filename) {
  console.log(filename)
  if (filename.includes('/node_modules')) {
    console.log(false)
    return false
  }
  else {
    console.log(true)
    return true
  }
}

function run(target, options) {

  let targetFile = path.resolve(cwd, target)
  let targetDir = path.dirname(targetFile)
  console.log(targetFile)
  let script

  if (fs.existsSync(targetFile)) {
    script = require(targetFile)
    if (script.handler) {
      server(script.handler, {port: options.port || 3000})
    }
  }
}

function server(handler, options) {
  const hostname = 'localhost';

  const server = http.createServer((req, res) => {
    let event = mapRequest(req)
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    handler(event, {}, (err, result) => {
      res.end(JSON.stringify(result))
    })
  });

  server.listen(options.port, hostname, () => {
    console.log(`Server running at http://${hostname}:${options.port}`);
  });
}

function mapRequest(request) {
  return {
    "method": request.method,
    "body" : request.body || {},
    "headers": request.headers,
    "params": url.parse(request.url, true).query,
    "pathParams": {} //needs work...
  }
}

//create a build folder
//copy entire project to build folder **except certain files**
//npm install inside
//deploy
