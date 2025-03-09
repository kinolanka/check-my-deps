// Mock deprecated package
console.warn('This package is deprecated and should not be used in production.');

module.exports = {
  name: 'deprecated-package',
  isDeprecated: true,
  getMessage: function() {
    return 'This package is deprecated';
  }
};
