// Dummy file for package-b
const express = require('express');

console.log('Package B loaded successfully');

module.exports = {
  name: 'package-b',
  doSomething: () => console.log('Doing something in package B')
};
