var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var rp = require('request-promise');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/search', function(req, res, next) {
  var query = req.query.query
  var options = {
    uri: 'https://msi.bbycastatic.ca/mobile-si/si/v3/products/search',
    qs: {
      query: 'samsung+s7',
      lang: 'en'
    },
    json: true
  }
  rp(options)
  .then(function(json) {
      res.render('index', {productList: json.searchApi.documents});
  });
});

router.get('/product/:id', function(req, res, next) {
  var skuId = req.params.id;
  var model;
  var options = {
    uri: 'https://msi.bbycastatic.ca/mobile-si/si/v4/pdp/overview/' + skuId,
    json: true
  }
  rp(options)
  .then(function(json) {
    model = json.overview.manufacturerId.modelNumber;
    title = json.overview.names.short;
    // res.render('productInfo', { product: json.overview });
  })
  .then(function() {
    scrape_camel(model)
    .then(function(prices) {
      console.log(prices);
    })
    .catch(function(e) {
      scrape_camel(title)
      .then(function(prices) {
        console.log(prices);
      });
    });
  });
});

var scrape_camel = function(search_query) {
  return new Promise(function(resolve, reject) {
    request("https://ca.camelcamelcamel.com/search?sq=" + search_query, function(error, response, body) {
      if(error) {
        console.log("Error: " + error);
      }

      var $ = cheerio.load(body);

      var firstItem = $('td.current_price.last').first();
      if (firstItem.text().trim().length == 0) {
        reject();
      }
      var price_amazon = firstItem.find('.price_amazon').text().trim();
      var price_new = firstItem.find('.price_new').text().trim();
      var lowest_price;
      if (price_amazon === "Not in Stock" && price_new === "Not in Stock") {
        lowest_price = 0;
      } else if (price_amazon === "Not in Stock" && price_new !== "Not in Stock") {
        lowest_price = Number(price_new.substr(1)).toFixed(2);
      } else if (price_amazon !== "Not in Stock" && price_new === "Not in Stock") {
        lowest_price = Number(price_amazon.substr(1)).toFixed(2);
      } else if (price_amazon < price_new) {
        lowest_price = Number(price_amazon.substr(1)).toFixed(2);
      } else {
        lowest_price = Number(price_new.substr(1)).toFixed(2);
      }
      resolve(lowest_price);
    });
  });
}

module.exports = router;
