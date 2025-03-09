// Dummy file for package-a
const React = require('react');
const _ = require('lodash');
const packageB = require('package-b');

console.log('Package A loaded successfully');

module.exports = {
  name: 'package-a',
  doSomething: () => console.log('Doing something in package A')
};
