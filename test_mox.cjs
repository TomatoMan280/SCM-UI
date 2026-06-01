const https = require('https');

const url = 'https://api.moxfield.com/v2/decks/all/eYurDI_IWUeqbNV5038DYQ';
const headers = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Origin": "https://www.moxfield.com",
  "Referer": "https://www.moxfield.com/"
};

https.get(url, { headers }, (res) => {
  console.log('Status code:', res.statusCode);
  res.on('data', d => process.stdout.write(d.toString().substring(0, 100)));
});
