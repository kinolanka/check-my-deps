// This is a dummy file for testing check-my-deps
console.log('This is a test project for check-my-deps');

// Import some dependencies to make the file look realistic
try {
  const express = require('express');
  const _ = require('lodash');
  const axios = require('axios');
  const moment = require('moment');
  const chalk = require('chalk');
  const { v4: uuidv4 } = require('uuid');
  
  console.log('All dependencies loaded successfully');
} catch (error) {
  console.error('Error loading dependencies:', error.message);
}
