module.exports = {
  publicPath: process.env.NODE_ENV === 'production'
    ? '/mininecjs/'
    : '/',
  productionSourceMap: false
}